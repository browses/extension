/*
 * Open a new tab that prompts the user to allow browses
 * access to the users facebook account information
 */

const facebookLogin = () => {
  // Open a new tab with the auth dialog
  chrome.tabs.create({
    url: 'https://www.facebook.com/dialog/oauth' +
    '?client_id=1659456037715738&response_type=token' +
    '&redirect_uri=https://www.facebook.com/connect/login_success.html' +
    '&scope=user_friends'
  });
}

/*
 * When a tab is opened, check if it is the login redirect url,
 * and extract the access token if so.
 */

const onFacebookLogin = () => {
  const successURL = 'https://www.facebook.com/connect/login_success.html#access_token=';
  chrome.tabs.query({}, tabs => {
    const successTab = tabs.find(x => x.url.indexOf(successURL) !== -1);
    if (successTab !== undefined) {
      const params = successTab.url.split('#')[1];
      const accessToken = params.split('&')[0].split('=')[1];
      // Store the new accessToken
      localStorage.setItem('accessToken', accessToken);
      // Close the login success tab
      chrome.tabs.remove(successTab.id);
      // Upload any pending browses
      uploadLatestBrowse();
    }
  });
}

/*
 * Once a browse has been uploaded then we want to show
 * a list of the most recent browses in a new tab
 */

const viewUserBrowses = ({browser}) => {
  // Redirect to the url for the users browses page
  const url = `http://browses.io/${browser}`;
  chrome.tabs.create({ url });
}

/*
 * Before uploading an image we crudly compress it using
 * a canvas element toDataURL quality option
 */

const compressImage = url => {
  const size = url.length;
  if (size > 100000) {
    const rate = (-0.0000005 * size) + 0.9;
    console.log(rate);
    const cvs = document.createElement('canvas');
    const img = new Image();
    img.src = url;
    cvs.width = img.naturalWidth;
    cvs.height = img.naturalHeight;
    cvs.getContext("2d").drawImage(img, 0, 0);
    return cvs.toDataURL('image/jpeg', rate);
  } return url;
}

/*
 * If a good token has been found then format the latest browse
 * data and POST it to the server for storage
 */

const uploadLatestBrowse = () => {
  // Set browser badge to indicate loading
  chrome.browserAction.setBadgeBackgroundColor({color:[210, 0, 60, 255]});
  chrome.browserAction.setBadgeText({text:' '});
  // Get the latest browse and extend with latest token
  const data = JSON.parse(localStorage.getItem('browse'));
  data.token = localStorage.getItem('accessToken');
  // Post shot to the browses api
  return fetch('https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta/browses', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  .then(data => data.json())
  .then(viewUserBrowses)
  .then(() => localStorage.removeItem('browse'))
  .then(() => chrome.browserAction.setBadgeText({ text: '' }));
}

const takeScreenshot = () => new Promise((resolve, reject) => {
  // Capture a base64 encoded image of active tab
  chrome.tabs.captureVisibleTab((screenshot) => {
    resolve(compressImage(screenshot));
  });
});

const getActiveTab = () => new Promise((resolve, reject) => {
  // Get the active tab object for title and url
  chrome.tabs.query({active: true, currentWindow: true}, (tab) => {
    resolve(tab[0]);
  });
});

const storeBrowseLocally = data => {
  // Put the browse data from last capture into storage
  localStorage.setItem('browse', JSON.stringify({
    image: data[0],
    url: data[1].url,
    title: data[1].title,
  }));
}

const checkAuthStatus = () => new Promise((resolve, reject) => {
  // Get the token if one exists
  const token = localStorage.getItem('accessToken');
  if(!token) reject();
  else {
    // Check with facebook to see if token is valid
    fetch(`https://graph.facebook.com/me?access_token=${ token }`)
    .then(data => data.json())
    .then(res => {
      if (res.error) reject();
      else resolve();
    });
  }
});

const captureBrowse = () => Promise.all([
  takeScreenshot(),
  getActiveTab()
])
.then(data => {
  // Store the latest capture data
  storeBrowseLocally(data);
  // Prompt auth or upload browse
  checkAuthStatus()
  .then(uploadLatestBrowse)
  .catch(facebookLogin);
});

chrome.tabs.onUpdated.addListener(onFacebookLogin);
chrome.browserAction.onClicked.addListener(captureBrowse);

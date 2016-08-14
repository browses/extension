/*
 * Open a new tab that prompts the user to allow browses
 * access to the users facebook account information
 */

function facebookLogin() {
  chrome.tabs.create({
    url: 'https://www.facebook.com/dialog/oauth' +
    '?client_id=1659456037715738&response_type=token' +
    '&redirect_uri=https://www.facebook.com/connect/login_success.html'
  });
}

/*
 * When a tab is opened, check if it is the login redirect url,
 * and extract the access token if so.
 */

function onFacebookLogin(){
  const successURL = 'https://www.facebook.com/connect/login_success.html#access_token=';
  chrome.tabs.query({}, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].url.indexOf(successURL) !== -1) {
        var params = tabs[i].url.split('#')[1];
        var accessToken = params.split('&')[0].split('=')[1];
        localStorage.setItem('accessToken', accessToken);
        chrome.tabs.remove(tabs[i].id);
        uploadLatestBrowse();
      }
    }
  });
}

/*
 * Once a browse has been uploaded then we want to show
 * a list of the most recent browses in a new tab
 */

const viewUserBrowses = shot => {
  // Get the url for the users browses page
  const usersPage = `screenshot.html?browser=${ shot.browser }`;
  var url = chrome.extension.getURL(usersPage);
  // Open a new tab with the users browses
  chrome.tabs.create({ url });
}

const uploadLatestBrowse = () => {
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
  .then(() => localStorage.setItem('browse',''));
}

const takeScreenshot = () => new Promise((resolve, reject) => {
  // Capture a base64 encoded image of active tab
  chrome.tabs.captureVisibleTab((screenshot) => {
    resolve(screenshot);
  });
});

const getActiveTab = () => new Promise((resolve, reject) => {
  // Get the active tab object for title and url
  chrome.tabs.query({active: true, currentWindow: true}, (tab) => {
    resolve(tab[0]);
  });
});

const storeBrowse = data => {
  // Put the browse data from last capture into storage
  localStorage.setItem('browse', JSON.stringify({
    shot: data[0],
    url: data[1].url,
    title: data[1].title,
  }));
}

const checkAuth = () => new Promise((resolve, reject) => {
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
  takeScreenshot(), getActiveTab()
])
.then(data => {
  storeBrowse(data);
  checkAuth()
  .then(uploadLatestBrowse)
  .catch(facebookLogin);
});

chrome.tabs.onUpdated.addListener(onFacebookLogin);
chrome.browserAction.onClicked.addListener(captureBrowse);


/*
 * Listen out for version request from browser
 * respond with the current version number
 */
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) =>
    request && request.message && request.message == "version"
    ? sendResponse({ version: chrome.runtime.getManifest().version })
    : true
);

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
};

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
      // Build Firebase credential with the Facebook auth token.
      const credential = firebase.auth.FacebookAuthProvider.credential(accessToken);
      // Sign in with the credential from the Facebook user.
      firebase.auth()
      .signInWithCredential(credential)
      .then(addUploadIndicator)
      .then(uploadImage)
      .then(storeBrowse)
      .then(removeUploadIndicator)
      .catch(console.log);
    }
  });
};

/*
 * Before uploading an image we crudly compress it using
 * a canvas element toDataURL quality option
 */
const compressImage = url => new Promise(function(resolve, reject) {
  const size = url.length;
  if (size > 100000) {
    const rate = (-0.0000005 * size) + 0.9;
    const cvs = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      cvs.width = img.naturalWidth;
      cvs.height = img.naturalHeight;
      cvs.getContext("2d").drawImage(img, 0, 0);
      resolve(cvs.toDataURL('image/jpeg', rate));
    }
    img.src = url;
  } else resolve(url);
});

const addUploadIndicator = () => {
  // Set browser badge to indicate loading
  chrome.browserAction.setBadgeBackgroundColor({ color: [210, 0, 60, 255] });
  chrome.browserAction.setBadgeText({ text: ' ' });
}

const removeUploadIndicator = () => {
  // Remove browser badge to indicate loading complete
  chrome.browserAction.setBadgeText({ text: '' })
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

const openWebView = () => new Promise((resolve, reject) => {
  // Open the users feed in a new tab or focus already open tab
  const uid = firebase.auth().currentUser.providerData[0].uid;
  const profile = 'https://browses.io/' + uid;
  chrome.tabs.getAllInWindow(undefined, function(tabs) {
    const profileTab = tabs.find(tab => tab.url === profile);
    if(profileTab) {
      chrome.tabs.update(profileTab.id, { selected: true });
      chrome.tabs.reload(profileTab.id);
    } else chrome.tabs.create({ url: profile });
  });
});

const storeBrowseLocally = data => {
  // Put the browse data from last capture into storage
  localStorage.setItem('browse', JSON.stringify({
    image: data[0],
    url: data[1].url,
    title: data[1].title,
  }));
};

/*
 * Check if we are still authenticated.
 */
const checkAuthStatus = () => new Promise((resolve, reject) => {
  // Get the token if one exists
  const token = localStorage.getItem('accessToken');
  if(!token) reject();
  else {
    // Sign in with the credential to see if token is valid
    const credential = firebase.auth.FacebookAuthProvider.credential(token);
    firebase.auth()
    .signInWithCredential(credential)
    .then(resolve)
    .catch(reject);
  }
});

/*
 * Promise to upload image to storage.
 */
const uploadImage = () => {
  const browse = JSON.parse(localStorage.getItem('browse'));
  const guid = database.ref('browses').push().key;
  const uid = firebase.auth().currentUser.uid;
  return storage.child(`${guid}`).putString(browse.image, 'data_url');
};

/*
 * Promise to upload browse to database.
 */
const storeBrowse = image => {
  const browse = JSON.parse(localStorage.getItem('browse'));
  const user = firebase.auth().currentUser;
  const fb = user.providerData[0];
  return database.ref(`browses/${image.ref.name}`)
  .set({
    key: image.ref.name,
    uid: user.uid,
    browser: fb.uid,
    name: fb.displayName,
    published: firebase.database.ServerValue.TIMESTAMP,
    views: 1,
    url: browse.url,
    title: browse.title,
    image: image.downloadURL,
  });
};

/*
 * Capture browse and upload.
 */
const captureBrowse = () => Promise.all([
  takeScreenshot(),
  getActiveTab(),
])
.then(data => {
  // Store the latest capture data
  storeBrowseLocally(data);
  // Prompt auth or upload browse
  checkAuthStatus()
  .then(addUploadIndicator)
  .then(uploadImage)
  .then(storeBrowse)
  .then(removeUploadIndicator)
  .then(openWebView)
  .catch(facebookLogin);
});

/*
 * Initialise Firebase
 */
firebase.initializeApp({
  apiKey: "AIzaSyDf0B5peKIIXbamijhyJjqtJtv6LsYiQIQ",
  authDomain: "browses-ef3f0.firebaseapp.com",
  databaseURL: "https://browses-ef3f0.firebaseio.com",
  storageBucket: "browses-ef3f0.appspot.com",
  messagingSenderId: "685716734453"
});

/*
 * Setup Firebase Services
 */
const database = firebase.database();
const storage = firebase.storage().ref();

chrome.tabs.onUpdated.addListener(onFacebookLogin);
chrome.browserAction.onClicked.addListener(captureBrowse);

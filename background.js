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
const compressImage = url => {
  const size = url.length;
  if (size > 100000) {
    const rate = (-0.0000005 * size) + 0.9;
    const cvs = document.createElement('canvas');
    const img = new Image();
    img.src = url;
    cvs.width = img.naturalWidth;
    cvs.height = img.naturalHeight;
    cvs.getContext("2d").drawImage(img, 0, 0);
    return cvs.toDataURL('image/jpeg', rate);
  } return url;
};

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
 * Return random guid string
 */
const getGUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/*
 * Promise to upload image to storage.
 */
const uploadImage = () => {
  const browse = JSON.parse(localStorage.getItem('browse'));
  const guid = getGUID();
  const uid = firebase.auth().currentUser.uid;
  return storage.child(`${uid}/${guid}`).putString(browse.image, 'data_url');
};

/*
 * Promise to upload browse to database.
 */
const storeBrowse = image => {
  const browse = JSON.parse(localStorage.getItem('browse'));
  const user = firebase.auth().currentUser;
  const fb = user.providerData[0];
  return database.ref(`browses/${image.ref.name}`)
  .setWithPriority({
    uid: user.uid,
    browser: fb.uid,
    name: fb.displayName,
    published: firebase.database.ServerValue.TIMESTAMP,
    url: browse.url,
    title: browse.title,
    image: image.downloadURL,
  }, -1 * Date.now());
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

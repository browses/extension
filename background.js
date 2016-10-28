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
      firebase.auth().signInWithCredential(credential)
      .then((firebaseUser) => {
        uploadLatestBrowse();
      })
      .catch(console.log);
    }
  });
};

/*
 * Once a browse has been uploaded then we want to show
 * a list of the most recent browses in a new tab
 */
const viewBrowses = () => {
  // Redirect to the url for the users browses page
  const url = 'http://browses.io';
  chrome.tabs.create({ url });
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

/*
 * If a good token has been found then format the latest browse
 * data and POST it to the server for storage
 */
const uploadLatestBrowse = () => {
  // Set browser badge to indicate loading
  chrome.browserAction.setBadgeBackgroundColor({ color: [210, 0, 60, 255] });
  chrome.browserAction.setBadgeText({ text: ' ' });
  // Get the latest browse and extend with latest token
  const data = JSON.parse(localStorage.getItem('browse'));
  // Post shot to the firebase
  uploadImage(data.image)
  .then((snapshot) => writeBrowseData(snapshot.ref.name, data.url, snapshot.downloadURL))
  .then(() => localStorage.removeItem('browse'))
  .then(() => chrome.browserAction.setBadgeText({ text: '' }));
};

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
    firebase.auth().signInWithCredential(credential)
    .then((firebaseUser) => resolve(firebaseUser))
    .catch(reject);
  }
});

/*
 * Capture browse and upload.
 */
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
 * Initialise Firebase
 */
const config = {
  apiKey: "AIzaSyDf0B5peKIIXbamijhyJjqtJtv6LsYiQIQ",
  authDomain: "browses-ef3f0.firebaseapp.com",
  databaseURL: "https://browses-ef3f0.firebaseio.com",
  storageBucket: "browses-ef3f0.appspot.com",
  messagingSenderId: "685716734453"
};
firebase.initializeApp(config);

const database = firebase.database();
const storage = firebase.storage().ref();

/*
 * Promise to upload browse to database.
 */
const writeBrowseData = (browse, url, image) => {
  return database.ref(`browses/${browse}`).set({
    uid: firebase.auth().currentUser.uid,
    browser: firebase.auth().currentUser.providerData[0].uid,
    name: firebase.auth().currentUser.providerData[0].displayName,
    published: firebase.database.ServerValue.TIMESTAMP,
    browsers: [firebase.auth().currentUser.providerData[0].uid],
    views: 1,
    url, image,
  });
};

/*
 * Promise to upload image to storage.
 */
const uploadImage = (image) => {
  const guid = getGUID();
  const uid = firebase.auth().currentUser.uid;
  return storage.child(`${uid}/${guid}`).putString(image, 'data_url');
};

chrome.tabs.onUpdated.addListener(onFacebookLogin);
chrome.browserAction.onClicked.addListener(captureBrowse);

# Browses

A chrome extension that allows you to publish your browsing history to a feed on https://browses.io. The extension authenticates users with facebook, then firebase. Once authenticated, the user can click the browser action button. This will initiate the _browsing_ process:

- Capture screenshot of the active tab
- Draw screenshot data to canvas and optimize for 100kb
- Upload the image to firebase file storage
- Log the uploaded image and metadata in firebase database

## Architecture

The extension takes advantage of google firebase auth, storage and database.

### Config

```
firebase.initializeApp({
  apiKey: "AIzaSyDf0B5peKIIXbamijhyJjqtJtv6LsYiQIQ",
  authDomain: "browses-ef3f0.firebaseapp.com",
  databaseURL: "https://browses-ef3f0.firebaseio.com",
  storageBucket: "browses-ef3f0.appspot.com",
  messagingSenderId: "685716734453"
})
```

### Database

The browses table contains users browses. It is indexed on `published` and `browser` keys. Browsers are allowed to write to the database if `newData.child('uid').val() == auth.uid` other browsers are allowed to add themselves to the list of browsers for a given browse if `auth.uid != null`.

```
browses: {
  -KlwxX-HBBgtkr3iebbS {
    key: "-KlwxX-HBBgtkr3iebbS",
    published: 1496745128113,
    uid: "yRmEi75kyKgyDsSf1krKQ8Q01bq2",
    browser: 10157368805735201,
    name: "Luke Jackson",
    image: ""https://firebasestorage.../-KlwxX-HBBgtkr3iebbS,
    title: "Ideas and guidelines for architecting larger ap...",
    url: "https://gist.github.com/evancz/2b2ba366cae1887f...",
    browsers: {
      10157368805735201: true,
    }
  }
}
```

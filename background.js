// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.captureVisibleTab(function(screenshotUrl) {
    chrome.tabs.query({active: true, currentWindow: true}, function(arrayOfTabs) {
      chrome.identity.getProfileUserInfo(function (userInfo) {
        /*
         * Open tab with url that redirects to Facebook Login.
         */
        var url = 'https://www.facebook.com/dialog/oauth' +
          '?client_id=1659456037715738&response_type=token' +
          '&redirect_uri=https://www.facebook.com/connect/login_success.html';
        chrome.tabs.create({ url: url });

        // var optimize = function(url, scale, quality){
        //    var shot = new Image();
        //    shot.src = url;
        //    var cvs = document.createElement('canvas');
        //    cvs.width = shot.naturalWidth*scale;
        //    cvs.height = shot.naturalHeight*scale;
        //    cvs.getContext('2d')
        //       .drawImage(shot, 0, 0, shot.naturalWidth*scale, shot.naturalHeight*scale);
        //    return cvs.toDataURL('image/jpeg', quality);
        // };
        //
        // var browse = {
        //   browser: 'joerobot',
        //   title: arrayOfTabs[0].title,
        //   shot: optimize(screenshotUrl, 0.5, 1),
        //   url: arrayOfTabs[0].url
        // };
        //
        // window.alert(JSON.stringify(browse));
        //
        // var xhr = new XMLHttpRequest();
        //
        // xhr.onreadystatechange = function() {
        //   if (xhr.readyState === 4) {
        //
        //     window.alert(xhr.responseText);
        //     var res = JSON.parse(xhr.responseText);
        //     var viewTabUrl = chrome.extension.getURL('screenshot.html?browser=' + res.browser);
        //     chrome.tabs.create({ url: viewTabUrl }, function() {});
        //   }
        // };
        //
        // xhr.open('POST', 'https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta/browses', true);
        // xhr.send(JSON.stringify(browse));

      });
    });
  });
});

var successURL = 'www.facebook.com/connect/login_success.html';
/*
 * When a tab is opened, check if its the login redirect url,
 * and extract the access token if so.
 */
function onFacebookLogin(){
  chrome.tabs.query({}, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].url.indexOf(successURL) !== -1) {
        var params = tabs[i].url.split('#')[1];
        var accessToken = params.split('&')[0];
        accessToken = accessToken.split('=')[1];

        localStorage.setItem('accessToken', accessToken);
        chrome.tabs.remove(tabs[i].id);

        /*
         * Send upvote to test.
         */
        var xhr = new XMLHttpRequest();
        var params = { url: 'browses', upvote: 'interesting', token: accessToken };
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            window.alert(xhr.responseText);
            var res = JSON.parse(xhr.responseText);
          }
        };
        xhr.open('POST', 'https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta/links/upvote', true);
        xhr.send(JSON.stringify(params));
      }
    }
  });
}
chrome.tabs.onUpdated.addListener(onFacebookLogin);

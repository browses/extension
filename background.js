// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.captureVisibleTab(function(screenshotUrl) {
    chrome.tabs.query({active: true, currentWindow: true}, function(arrayOfTabs) {
      chrome.identity.getProfileUserInfo(function (userInfo) {

        var optimize = function(url, scale, quality){
           var shot = new Image();
           shot.src = url;
           var cvs = document.createElement('canvas');
           cvs.width = shot.naturalWidth*scale;
           cvs.height = shot.naturalHeight*scale;
           cvs.getContext('2d')
              .drawImage(shot, 0, 0, shot.naturalWidth*scale, shot.naturalHeight*scale);
           return cvs.toDataURL('image/jpeg', quality);
        };

        var browse = {
          browser: 'joerobot',
          title: arrayOfTabs[0].title,
          shot: optimize(screenshotUrl, 0.5, 1),
          url: arrayOfTabs[0].url
        };

        window.alert(JSON.stringify(browse));

        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {

            window.alert(xhr.responseText);
            var res = JSON.parse(xhr.responseText);
            var viewTabUrl = chrome.extension.getURL('screenshot.html?browser=' + res.browser);
            chrome.tabs.create({ url: viewTabUrl }, function() {});
          }
        };

        xhr.open('POST', 'https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta/browses', true);
        xhr.send(JSON.stringify(browse));

      });
    });
  });
});

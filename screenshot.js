// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    };
}

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
         var pair = vars[i].split("=");
         if(pair[0] == variable){return pair[1];}
  }
  return(false);
}

function timeSince(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' years';
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' months';
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' days';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hours';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minutes';
    return Math.floor(seconds) + ' seconds';
}

var xhr = new XMLHttpRequest();

var browseItemComponent = function (browse) {
  return `
    <browse->
      <a target="_blank" href="${browse.url}">
        <img src="${browse.shot}" />
      </a>
      <article>
        <title->${browse.title}</title->
        <info->Shot by <a href="/${browse.nam}">${browse.name}</a> ${timeSince(browse.published)} ago</info->
        <browser-count>${browse.browsers.length} Other Browsers</browser-count>
      </article>
    </browse->
  `;
};

xhr.onreadystatechange = function() {
  if (xhr.readyState === 4) {
    var feed = document.querySelector('browses-feed');
    var browses = JSON.parse(xhr.responseText);
    var templates = browses.map(function(browse) {
      return browseItemComponent(browse);
    });

    feed.innerHTML = templates.sort(dynamicSort('published')).join('');
  }
};

xhr.open('GET', `https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta/browses/${getQueryVariable('browser')}`, true);
xhr.send();

document.querySelector('user-name h1').innerHTML = getQueryVariable('browser');

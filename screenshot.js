function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
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

var browseItem = function (browse) {
  return `
    <browse->
      <a target="_blank" href="${browse.url}">
        <img src="${browse.shot}" />
      </a>
      <article>
        <title->${browse.title}</title->
        <info->Shot by <a href="/${browse.browser}">${browse.name}</a> ${timeSince(browse.published)} ago</info->
        <browser-count>${browse.browsers.length} Other Browsers</browser-count>
      </article>
    </browse->
  `;
};

var $feed = document.querySelector('browses-feed');
var $user = document.querySelector('user-name h1');

$user.innerHTML = getQueryVariable('browser');

fetch(`https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta/browses/${getQueryVariable('browser')}`)
.then(data => data.json())
.then(data => data.sort((a, b) => {
  if (a.published > b.published) { return 1; }
  if (a.published < b.published) { return -1; }
  return 0;
}))
.then(data => data.reverse().map(browseItem))
.then(data => $feed.innerHTML = data.join(''))

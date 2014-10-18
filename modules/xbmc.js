var request = require("request");
var wol = require('wake_on_lan');

function send(url, user, pw, command) {
  json = {jsonrpc:"2.0",method: command,id:1};
  url = "http://" + user + ":" + pw + "@" + url + "/jsonrpc?request=" +  encodeURIComponent(JSON.stringify(json));
  request(url, function(error, response, body) {
    return body;
  });
}

module.exports = {
  off: function(url, user, pw) {
    send(url, user, pw, "System.Shutdown");
    return ({interface: "xbmc", command: "power_down", success: true});
  },
  on: function(mac) {
    wol.wake(mac);
    return ({interface: "xbmc", command: "power_on", success: true});
  },
  status: function(url, user, pw) {
    send(url, user, pw, "System.GetInfoLabels");
  }
}

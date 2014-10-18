var config = require('./config.js');
var restify = require('restify');
var cradle = require('cradle');
var xbmc = require('./modules/xbmc.js');

var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort(config.serial.port, {
  baudrate: config.serial.baudrate
}, false);

// write all incoming data to screen
serialPort.open(function (err) {
  if (err) {
     console.log(err);
     return;
  } else {    
    serialPort.on("data", function (data) {
      console.log("serial-incoming: "+data);
    });
  }
});

// power_plugs is supposed to get filled by a serial read function
var power_plugs = {"rack" : { plug_states: [0,0,0,0,0,0] }};

function xbmcOff(req, res, next) {
  res.send(xbmc.off(config.xbmc.url, config.xbmc.user, config.xbmc.pw))
}
function xbmcOn(req, res, next) {
  res.send(xbmc.on(config.xbmc.mac))
}
function xbmcStatus(req, res, next) {
  res.send(xbmc.status(config.xbmc.url, config.xbmc.user, config.xbmc.pw))
}

function plugStatus(req, res, next) {
  serialPort.write("\02I0148\03");
  res.send({socket: req.params.socket_name,
            plugs: power_plugs[req.params.socket_name].plug_states });
}
function plugOn(req, res, next) {
  power_plugs[req.params.socket_name].plug_states[req.params.plug_id] = 1;
  serialPort.write("\02J01aaaaaaaaaa3F0000000000000000000F000048\03");
  res.send({socket: req.params.socket_name,
            plugs: power_plugs[req.params.socket_name].plug_states });
}
function plugOff(req, res, next) {
  power_plugs[req.params.socket_name].plug_states[req.params.plug_id] = 0;
  serialPort.write("\02J01aaaaaaaaaa000000000000000000000F00003D\03");
  res.send({socket: req.params.socket_name,
            plugs: power_plugs[req.params.socket_name].plug_states });
}

var server = restify.createServer({
    name : config.server.name
});

server.pre(restify.sanitizePath());
server.get('/xbmc' , xbmcStatus);
server.get('/xbmc/on' , xbmcOn);
server.get('/xbmc/off' , xbmcOff);
server.get('/power_plug/:socket_name' , plugStatus);
server.get('/power_plug/:socket_name/:plug_id/on' , plugOn);
server.get('/power_plug/:socket_name/:plug_id/off' , plugOff);

server.listen(config.server.port, config.server.url, function(){
    console.log('%s listening at %s:%s ', config.server.name , config.server.url, config.server.port);
});

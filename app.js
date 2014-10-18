var config = require('./config.js');
var restify = require('restify');
var cradle = require('cradle');
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

function plugState(req, res, next) {
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
server.get('/power_plug/:socket_name' , plugState);
server.get('/power_plug/:socket_name/:plug_id/on' , plugOn);
server.get('/power_plug/:socket_name/:plug_id/off' , plugOff);

server.listen(config.server.port, config.server.url, function(){
    console.log('%s listening at %s:%s ', config.server.name , config.server.url, config.server.port);
});

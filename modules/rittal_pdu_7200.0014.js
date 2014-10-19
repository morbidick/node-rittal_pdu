var power_plugs = {"rack" : { plug_states: [0,0,0,0,0,0] }};

var serialPort;

module.exports = {
  init: function(port) {
    serialPort = port;

    serialPort.on("data", function (data) {
      console.log("serial-incoming: "+data);
    });
  },
  status: function(socket) {
    serialPort.write("\02I0148\03");
    return({socket: socket,
            plugs: power_plugs[socket].plug_states });
  },
  on: function(socket, plug) {
    power_plugs[socket].plug_states[plug] = 1;
    serialPort.write("\02J01aaaaaaaaaa3F0000000000000000000F000048\03");
    return({socket: socket,
            plugs: power_plugs[socket].plug_states });
  },
  off: function(socket, plug) {
    power_plugs[socket].plug_states[plug] = 0;
    serialPort.write("\02J01aaaaaaaaaa000000000000000000000F00003D\03");
    return({socket: socket,
            plugs: power_plugs[socket].plug_states });
  }
}


'use strict';

var serialPort;
var startbyte = '\u0002';
var endbyte = '\u0003';
var sockets = { 1: {
                          name: "rack",
                          timestamp: 0,
                          plug_states: {
                                        1: false,
                                        2: false,
                                        3: false,
                                        4: false,
                                        5: false,
                                        6: false
                                        }
                        }
                  };

var bitmap_to_hex = function(binary_array) {
  var temp = 0,
  length = Object.keys(binary_array).length,
  result = "";


  for ( var i=length; i>0; i-- ) {
    temp += binary_array[i]*Math.pow(2,(i-1)%4);
    if ( (i-1)%4 == 0 ) {
      result += temp.toString(16);
      temp = 0;
    }
  }

  return result.toUpperCase();
}

var checksum = function(string) {
  var checksum = 0;
  for(var i = 0; i < string.length; i++) {
    checksum = checksum ^ string.charCodeAt(i);
  }
  return checksum.toString(16).toUpperCase();
}

var pad_string = function(string, length, pad_right, padding) {
  var length = length || 10;
  var padding = padding || "0"

  while (string.length < length) {
    if (pad_right) {
      string += padding;
    } else {
      string = padding + string;
    }
  }

  return string;
}

var send_command = function(id, name, plug_states, low_alarm, high_alarm) {
  var low_alarm = low_alarm || "0";
  var high_alarm = high_alarm || "F";

  var command = "J"
              + pad_string(id.toString(), 2)
              + pad_string(name, 10, true)
              + bitmap_to_hex(plug_states)
              + "0000000000000000000"
              + high_alarm
              + "000"
              + low_alarm;

  command = startbyte
          + command
          + pad_string(checksum(command), 2)
          + endbyte;

  console.log("Rittal PDU sending: %s", command);
  serialPort.write(command);
}

var request_state = function(id) {
  var command = "I"
              + pad_string(id.toString(), 2);

  command = startbyte + command + pad_string(checksum(command), 2) + endbyte;

  serialPort.write(command);
}

module.exports = {
  init: function(port) {
    serialPort = port;

    serialPort.on("data", function (data) {
      console.log("serial-incoming: "+data);
    });

    console.log('Rittal PDU initialized!');
  },
  get_socket: function(socket, force_refresh) {
    if (force_refresh) {
      request_state(socket);
      // TODO: return async status;
    }
    return({id: socket,
            name: sockets[socket].name,
            plugs: sockets[socket].plug_states });
  },
  set_socket: function(socket, plug_states) {
    sockets[socket].plug_states = plug_states;
    send_command(socket, sockets[socket].name, sockets[socket].plug_states);
    return({id: socket,
            name: sockets[socket].name,
            plugs: sockets[socket].plug_states });
  },
  set_plug_on: function(socket, plug) {
    sockets[socket].plug_states[plug] = true;
    send_command(socket, sockets[socket].name, sockets[socket].plug_states);
    return({id: socket,
            name: sockets[socket].name,
            plugs: sockets[socket].plug_states});
  },
  set_plug_off: function(socket, plug) {
    sockets[socket].plug_states[plug] = false;
    send_command(socket, sockets[socket].name, sockets[socket].plug_states);
    return({id: socket,
            name: sockets[socket].name,
            plugs: sockets[socket].plug_states});
  }
}

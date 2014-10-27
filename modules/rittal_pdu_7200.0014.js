//'use strict'; // TODO: cant use octal escape sequences in strict mode

var serialPort;
var startbyte = "\02";
var endbyte = "\03";
var power_plugs = { "rack": {
                              id: 1,
                              plug_states: [false,false,false,false,false,false] 
                            }
                  };

var bitmap_to_hex = function(binary_array) {
  var temp = 0,
  result = "";

  for ( var i=binary_array.length-1; i>=0; i-- ) {
    temp += binary_array[i]*Math.pow(2,i%4);
    if ( i%4 == 0 ) {
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
  status: function(socket, force_refresh) {
    if (force_refresh) {
      request_state(power_plugs[socket].id);
      // TODO: return async status;
    }
    return({socket: socket,
            plugs: power_plugs[socket].plug_states });
  },
  on: function(socket, plug) {
    power_plugs[socket].plug_states[plug-1] = true;
    send_command(power_plugs[socket].id, socket, power_plugs[socket].plug_states);
    return({socket: socket,
            plugs: power_plugs[socket].plug_states});
  },
  off: function(socket, plug) {
    power_plugs[socket].plug_states[plug-1] = false;
    send_command(power_plugs[socket].id, socket, power_plugs[socket].plug_states);
    return({socket: socket,
            plugs: power_plugs[socket].plug_states});
  }
}


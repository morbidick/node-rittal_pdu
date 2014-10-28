'use strict';

var serialPort;
var startbyte = '\u0002';
var endbyte = '\u0003';
var max_request_time = 500;
var timeout_error = { code: "SerialTimeout", message: "The Rittal PDU took to long to answer!"}
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
  var padding = padding || "0";

  while (string.length < length) {
    if (pad_right) {
      string += padding;
    } else {
      string = padding + string;
    }
  }

  return string;
}

module.exports = {
  init: function(port) {
    serialPort = port;

    serialPort.on("data", function (data) {
      console.log("serial-incoming: "+data);
    });

    console.log('Rittal PDU initialized!');
  },
  getSocket: function(socket, callback) {
    if (callback) {
      request_state(socket);
      // TODO: return async status;
    }
    return({id: socket,
            name: sockets[socket].name,
            plugs: sockets[socket].plug_states });
  },
  setSocket: function(id, plug_states, name, low_alarm, high_alarm, callback) {

    var low_alarm = "0";
    var high_alarm = "F";
    if (arguments.length == 3) { //TODO: make the optional parameters more awesome
      var name = sockets[id].name;
      var callback = arguments[2];
    }

    var return_value = startbyte + "j6A" + endbyte;
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

    var waitForSuccess = function (data) {
      if (data == return_value) {
        clearTimeout(timeout);
        console.log("Rittal PDU: success");
        serialPort.removeListener("data", waitForSuccess);
        if (typeof(callback) == 'function') {
          callback();
        }
      }
    };

    var timeout = function () {
      serialPort.removeListener("data", waitForSuccess);
      if (typeof(callback) == 'function') {
        callback(timeout_error);
      }
    }

    serialPort.on("data", waitForSuccess);
    setTimeout(timeout, max_request_time);

  }
}

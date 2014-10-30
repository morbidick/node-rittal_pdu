'use strict';

var serialPort;
var startbyte = '\u0002';
var endbyte = '\u0003';
var max_request_time = 500;
var timeout_error = { code: "SerialTimeout", message: "The Rittal PDU took to long to answer!"}

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
var hex_to_bitmap = function(data) {
  var bit_count = 6;
  data = parseInt(data,16);
  var result = {};

  for (var i = bit_count; i > 0; i--) {
    if (data >= Math.pow(2,i-1)) {
      result[i] = true;
      data -= Math.pow(2,i-1);
    } else {
      result[i] = false;
    }
  }

  return result;
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

var status_to_object = function(data) {
  return {
    raw: data,
    id: parseInt(data.slice(1,3)),
    name: data.slice(6,16),
    plug_states: hex_to_bitmap(data.slice(30,32)),
    power_consumption: parseInt(data.slice(23,27)),
    high_alarm: parseInt(data.slice(35,36), 16),
    low_alarm: parseInt(data.slice(39,40), 16),
  }
}

module.exports = {
  init: function(port) {

    serialPort = port;
    console.log('Rittal PDU: initialized!');

  },
  getSocket: function(id, callback) {

    var temp = "";

    var command = "I"
                + pad_string(id.toString(), 2);

    command = startbyte + command + pad_string(checksum(command), 2) + endbyte;

    console.log("Rittal PDU: sending %s", command);
    serialPort.write(command);

    var dataHandler = function (data) {
      data = data.toString();
      for(var i = 0; i < data.length; i++) {
        switch(data.charAt(i)) {
          case startbyte:
            temp = "";
            break;

          case endbyte:
            clearTimeout(timeoutHandler);
            serialPort.removeListener("data", dataHandler);

            if( temp.charAt(0) == "i" && checksum(temp.slice(0,-2)) == temp.slice(-2)) {
              console.log("Rittal PDU: received status with right checksum");
              callback.apply(status_to_object(temp));
            }
            break;

          default:
            temp += data.charAt(i);
        }
      }
    };

    var timeoutHandler = function () {
      serialPort.removeListener("data", dataHandler);
      if (typeof(callback) == 'function') {
        callback(timeout_error);
      }
    }

    serialPort.on("data", dataHandler);
    setTimeout(timeoutHandler, max_request_time);

  },
  setSocket: function(id, plug_states, opt_params, callback) {

    var params = {
      low_alarm: 0,
      high_alarm: 15,
      name: "empty"
    }

    if (arguments.length == 4) {
      for(var i in params) {
        if(typeof(opt_params[i]) !== "undefined") {
          params[i] = opt_params[i];
        }
      }
    } else {
      var callback = arguments[3];
    }

    var return_value = startbyte + "j6A" + endbyte;
    var command = "J"
                + pad_string(id.toString(), 2)
                + pad_string(params.name, 10, true)
                + bitmap_to_hex(plug_states)
                + "0000000000000000000"
                + params.high_alarm.toString(16).toUpperCase()
                + "000"
                + params.low_alarm.toString(16).toUpperCase();

    command = startbyte
            + command
            + pad_string(checksum(command), 2)
            + endbyte;

    console.log("Rittal PDU: sending %s", command);
    serialPort.write(command);

    var dataHandler = function (data) {
      if (data == return_value) {
        clearTimeout(timeoutHandler);
        console.log("Rittal PDU: success");
        serialPort.removeListener("data", dataHandler);
        if (typeof(callback) == 'function') {
          callback();
        }
      }
    };

    var timeoutHandler = function () {
      serialPort.removeListener("data", dataHandler);
      if (typeof(callback) == 'function') {
        callback(timeout_error);
      }
    }

    serialPort.on("data", dataHandler);
    setTimeout(timeoutHandler, max_request_time);

  }
}

'use strict';

var SerialPort_module = require("serialport");
var SerialPort = SerialPort_module.SerialPort;
var serialPort;
var baudrate = 19200;
var startbyte = '\u0002';
var endbyte = '\u0003';
var stopbyte = '\u0000';
var max_request_time = 500;
var timeout_error = { code: "SerialTimeout", message: "The Rittal PDU took to long to answer!"};

var bitmap_to_hex = function (binary_array) {
  var temp = 0,
  length = Object.keys(binary_array).length,
  result = "";


  for (var i = length; i>0; i--) {
    temp += binary_array[i]*Math.pow(2,(i-1)%4);
    if ( (i-1)%4 === 0 ) {
      result += temp.toString(16);
      temp = 0;
    }
  }

  return result.toUpperCase();
};

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
};

var checksum = function(string) {
  var checksum = 0;
  for(var i = 0; i < string.length; i++) {
    checksum = checksum ^ string.charCodeAt(i);
  }
  return checksum.toString(16).toUpperCase();
};

var pad_left = function(string, length, padding) {
  var length = length || 2;
  var padding = padding || "0";

  while (string.length < length) {
    string = padding + string;
  }

  return string;
};

var pad_right = function(string, length, padding) {
  var length = length || 10;
  var padding = padding || "0";

  if (string.length < length) {
    string += stopbyte;
  }

  while (string.length < length) {
    string += padding;
  }

  return string;
};

var remove_right_padding = function(string) {
  var pos = string.indexOf(stopbyte);

  if (pos !== -1) {
    return string.slice(0,pos);
  } else {
    return string;
  }

}

var status_to_object = function(data) {
  return {
    "raw": data,
    "id": parseInt(data.slice(1,3)),
    "name": remove_right_padding(data.slice(6,16)),
    "plug_states": hex_to_bitmap(data.slice(30,32)),
    "power_consumption": parseInt(data.slice(23,27)),
    "high_alarm": parseInt(data.slice(35,36), 16),
    "low_alarm": parseInt(data.slice(39,40), 16),
  };
};

module.exports = {
  init: function(port, callback) {

    serialPort = new SerialPort(port, {
      baudrate: baudrate
    }, false);

    serialPort.open(callback);

  },
  getSocket: function(id, callback) {

    var temp = "";

    var command = "I"
                + pad_left(id.toString(), 2);

    command = startbyte + command + pad_left(checksum(command), 2) + endbyte;

    serialPort.write(command);

    var dataHandler = function (data) {
      data = data.toString();
      for(var i = 0; i < data.length; i++) {
        switch(data.charAt(i)) {
          case startbyte:
            temp = "";
            break;

          case endbyte:
            clearTimeout(timeout);
            serialPort.removeListener("data", dataHandler);

            if( temp.charAt(0) == "i" && checksum(temp.slice(0,-2)) == temp.slice(-2)) {
              // Rittal PDU: received status with right checksum
              if (typeof(callback) === 'function') {
                callback(false, status_to_object(temp));
              }
            }
            break;

          default:
            temp += data.charAt(i);
        }
      }
    };

    var timeoutHandler = function () {
      serialPort.removeListener("data", dataHandler);
      if (typeof(callback) === 'function') {
        callback(timeout_error, false);
      }
    };

    serialPort.on("data", dataHandler);
    var timeout = setTimeout(timeoutHandler, max_request_time);

  },
  setSocket: function(options, callback) {
    var id = options.id || 1;
    var name = options.name || "default";
    var plug_states = options.plug_states || { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false} ;
    var low_alarm = options.low_alarm || 0;
    var high_alarm = options.high_alarm || 15;

    var return_value = startbyte + "j6A" + endbyte;
    var command = "J"
                + pad_left(id.toString(), 2)
                + pad_right(name, 10)
                + bitmap_to_hex(plug_states)
                + "0000000000000000000"
                + high_alarm.toString(16).toUpperCase()
                + "000"
                + low_alarm.toString(16).toUpperCase();

    command = startbyte
            + command
            + pad_left(checksum(command), 2)
            + endbyte;

    serialPort.write(command);

    var dataHandler = function (data) {
      if (data == return_value) {
        clearTimeout(timeout);
        serialPort.removeListener("data", dataHandler);
        if (typeof(callback) === 'function') {
          callback(false, {"id": id, "name": name, "plug_states": plug_states, "high_alarm": high_alarm, "low_alarm": low_alarm});
        }
      }
    };

    var timeoutHandler = function () {
      serialPort.removeListener("data", dataHandler);
      if (typeof(callback) === 'function') {
        callback(timeout_error, false);
      }
    };

    serialPort.on("data", dataHandler);
    var timeout = setTimeout(timeoutHandler, max_request_time);

  }
};

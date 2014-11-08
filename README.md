NodeJS Rittal PDU package
============================

Simple module to control Rittal PDU power plugs.

How to use
---------------

Add `"rittal_pdu": "git://github.com/morbidick/node-rittal_pdu.git#master"` to your package.json and use it with `var power_plugs = require("node-rittal_pdu")` in your app.


## init(port, callback)

Initializes the serial interface. 
  * The Rittal PDU 7200.0014 uses RS485 to communicate, the `port` is the corresponding serial device.
  * The `callback` is optional and is called once the write operation returns. The callback should be a function that looks like: `function (error) { ... }`

## getSocket(id, callback)

Returns the plug states and additional parameters.
  * `id` is the id of the corresponding Rittal device and should be an integer between 1 and 8.
  * The `callback` is called once the power plug answers or the operation times out. The callback should be a function that looks like: `function (error) { ... }`. On timeout `error` contains an error message else `this` will contain an object similar to the following

    ````json
    {
        "raw": "i01N15default000025801000801013F000F00007C",
        "id": 1,
        "name": "default",
        "plug_states": {
            "1": true,
            "2": true,
            "3": true,
            "4": true,
            "5": true,
            "6": true
        },
        "power_consumption": 80,
        "high_alarm": 15,
        "low_alarm": 0
    }
    ````

    * `raw` contains the raw return value for further analysis
    * `id`
    * `name` the internal name
    * `plug_states` object containing the plugs 1 to 6 and their states (true/false)
    * `power_consumption` output off all 6 plugs in Watt
    * `high_alarm` and `low_alarm` are the alarms in Amper (15 and 0 to deactivate)

## getSocket(options, callback)

Sets the plug states and additional parameters.
  * options might look like the following object and contain none or all of the parameters:

    ````json
    {
        "id": 1,
        "name": "default",
        "plug_states": {
            "1": false,
            "2": false,
            "3": false,
            "4": false,
            "5": false,
            "6": false
        },
        "high_alarm": 15,
        "low_alarm": 0
    }
    ````

    * `id` is the id of the corresponding Rittal device and should be an integer between 1 and 8 (default: 1)
    * `name` the internal name (default: default)
    * `plug_states` object containing the plugs 1 to 6 and their states (default: false)
    * `high_alarm` and `low_alarm` are the alarms in Amper (default: 15 and 0)
  * The `callback` is called once the operation is acknowledged by the power plug or the operation times out. The callback should be a function that looks like: `function (error) { ... }`. On timeout `error` will be set.

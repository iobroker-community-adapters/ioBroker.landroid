/**
 *
 *      ioBroker Worx Landroid Adapter
 *
 *      (c) 2017 ldittmar <iobroker@lmdsoft.de>
 *
 *      MIT License
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
const utils = require(__dirname + "/lib/utils"); // Get common adapter utils
const request = require('request');
const ping = require(__dirname + '/lib/ping');

let ip, pin, data, getOptions;
let isConnected = null;

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: "landroid"
    });
    adapter = new utils.Adapter(options);

    // is called when adapter shuts down - callback has to be called under any circumstances!
    adapter.on("unload", function (callback) {
        try {
            adapter.log.info("cleaned everything up...");
            callback();
        } catch (e) {
            callback();
        }
    });

    // is called if a subscribed object changes
    adapter.on("objectChange", function (id, obj) {
        // Warning, obj can be null if it was deleted
        adapter.log.info("objectChange " + id + " " + JSON.stringify(obj));
    });

    // is called if a subscribed state changes
    adapter.on("stateChange", function (id, state) {
        if (!state) {
            return;
        }

        if (id === adapter.namespace + ".mower.start" && state.val) {
            startMower();
        } else if (id === adapter.namespace + ".mower.stop" && state.val) {
            stopMower();
        }
    });

    // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
    adapter.on("message", function (obj) {
        if (typeof obj == "object" && obj.message) {
            if (obj.command == "send") {
                // e.g. send email or pushover or whatever
                console.log("send command");

                // Send response in callback if required
                if (obj.callback)
                    adapter.sendTo(obj.from, obj.command, "Message received", obj.callback);
            }
        }
    });

    // is called when databases are connected and adapter received configuration.
    // start here!
    adapter.on("ready", main);

    return adapter;
}

function startMower() {
    adapter.log.info("Start Landroid");
    doPost('data=[["settaggi", 11, 1]]');
    adapter.setState("mower.start", {val: false, ack: true});
}

function stopMower() {
    adapter.log.info("Stop Landroid");
    doPost('data=[["settaggi", 12, 1]]');
    adapter.setState("mower.stop", {val: false, ack: true});
}

function doPost(postData) {
    var options = {
        url: "http://" + ip + ":80/jsondata.cgi",
        async: true,
        method: 'POST',
        cache: false,
        body: postData,
        headers: {'Content-length': postData.length, 'Content-type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', "Authorization": 'Basic ' + new Buffer('admin:' + pin).toString('base64')}
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            data = JSON.parse(body);
            evaluateResponse();
        }
    });
}

function evaluateCalendar(arrHour, arrMin, arrTime) {
    if (arrHour && arrMin && arrTime) {
        const weekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (var i = 0; i < weekday.length; i++) {
            var starttime = (arrHour[i] < 10) ? "0" + arrHour[i] : arrHour[i];
            starttime += ":";
            starttime += (arrMin[i] < 10) ? "0" + arrMin[i] : arrMin[i];
            adapter.setState("calendar." + weekday[i] + ".startTime", {val: starttime, ack: true});
            adapter.setState("calendar." + weekday[i] + ".workTime", {val: arrTime[i] * 0.1, ack: true});
        }
    }
}

function getStatus(statusArr, alarmArr) {

    if (statusArr && alarmArr) {

        let alarm = false;
        for (let i = 0; i < alarmArr.length; i++) {
            if (alarmArr[i] === 1) {
                alarm = true;
                break;
            }
        }

        if (statusArr[14] === 1 && !alarm) {
            return 'manual_stop';
        } else if (statusArr[5] === 1 && statusArr[13] === 0 && !alarm) {
            return 'charging';
        } else if (statusArr[5] === 1 && statusArr[13] === 1 && !alarm) {
            return 'charge_completed';
        } else if (statusArr[15] === 1 && !alarm) {
            return 'going_home';
        } else if (alarmArr[0] === 1) {
            return 'blade_blocked';
        } else if (alarmArr[1] === 1) {
            return 'repositioning_error';
        } else if (alarmArr[2] === 1) {
            return 'outside_wire';
        } else if (alarmArr[3] === 1) {
            return 'blade_blocked';
        } else if (alarmArr[4] === 1) {
            return 'outside_wire';
        } else if (alarmArr[10] === 1) {
            return 'mower_tilted';
        } else if (alarmArr[5] === 1) {
            return 'mower_lifted';
        } else if (alarmArr[6] === 1 || alarmArr[7] === 1 || alarmArr[8] === 1) {
            return 'error';
        } else if (alarmArr[9] === 1) {
            return 'collision_sensor_blocked';
        } else if (alarmArr[11] === 1) {
            return 'charge_error';
        } else if (alarmArr[12] === 1) {
            return 'battery_error';
        } else {
            return 'mowing';
        }
    }
}

function procedewg796e() {
    adapter.setObjectNotExists('mower.totalTime', {
        type: 'state',
        common: {
            name: "Total mower time",
            type: "number",
            role: "value.interval",
            unit: "h",
            read: true,
            write: false,
            desc: "Total time the mower has been mowing in hours"
        },
        native: {}
    });
    adapter.setState("mower.totalTime", {val: data.ore_movimento * 0.1, ack: true});
}

function procedewg797e1() {
    adapter.setObjectNotExists('mower.distance', {
        type: 'state',
        common: {
            name: "Total mower distance",
            type: "number",
            role: "value.interval",
            unit: "m",
            read: true,
            write: false,
            desc: "Total distance the mower has been mowing in hours"
        },
        native: {}
    });
    adapter.setObjectNotExists('mower.batteryChargerState', {
        type: 'state',
        common: {
            name: "Battery charger state",
            type: "string",
            role: "value.interval",
            read: true,
            write: false,
            desc: "Battery charger state"
        },
        native: {}
    });
    adapter.setObjectNotExists('mower.workReq', {
        type: 'state',
        common: {
            name: "Work request",
            type: "string",
            role: "value.interval",
            read: true,
            write: false,
            desc: "Last request from user"
        },
        native: {}
    });
    adapter.setObjectNotExists('mower.message', {
        type: 'state',
        common: {
            name: "Message",
            type: "string",
            role: "value.interval",
            read: true,
            write: false,
            desc: "Landroid message"
        },
        native: {}
    });
    adapter.setState("mower.distance", {val: data.distance, ack: true});
    adapter.setState("mower.batteryChargerState", {val: data.batteryChargerState, ack: true});
    adapter.setState("mower.workReq", {val: data.workReq, ack: true});
    adapter.setState("mower.message", {val: data.message, ack: true});
}

function createStates() {
    if ("ore_movimento" in data) {
        procedewg796e();
    } else {
        procedewg797e1();
    }
}

function checkFirmware() {
    if (data.CntProg) {
        return "0." + data.CntProg;
    }
    return data.versione_fw;
}

function evaluateResponse() {
    adapter.setState("info.lastsync", {val: new Date().toISOString(), ack: true});
    adapter.setState("info.firmware", {val: checkFirmware(data), ack: true});

    evaluateCalendar(data.ora_on, data.min_on, data.ore_funz);

    adapter.setState("mower.waitRain", {val: data.rit_pioggia, ack: true});
    adapter.setState("mower.batteryState", {val: data.perc_batt, ack: true});
    adapter.setState("mower.areasUse", {val: data.num_aree_lavoro, ack: true});
    adapter.setState("mower.borderCut", {val: data.enab_bordo === 1, ack: true});
    adapter.setState("mower.status", {val: data.state || getStatus(data.settaggi, data.allarmi), ack: true});

    createStates(data);
}

function createInfoObjects() {

    adapter.delObject('mower.connected');
    adapter.delObject('firmware');
    adapter.delObject('lastsync');

    adapter.setObjectNotExists('info', {
        type: 'channel',
        common: {
            name: "Information"
        },
        native: {}
    });
    adapter.setObjectNotExists('info.connection', {
        type: 'state',
        common: {
            name: "Landroid connected",
            type: "boolean",
            role: "indicator.connected",
            read: true,
            write: false,
            def: false,
            desc: "Is Landroid mower connected?"
        },
        native: {}
    });
    adapter.setObjectNotExists('info.lastsync', {
        type: 'state',
        common: {
            name: "Last successful sync",
            type: "string",
            role: "value.datetime",
            read: true,
            write: false,
            desc: "Last successful synchronization"
        },
        native: {}
    });
    adapter.setObjectNotExists('info.firmware', {
        type: 'state',
        common: {
            name: "Firmware Version",
            type: "string",
            role: "meta.version",
            read: true,
            write: false,
            desc: "Firmware Version"
        },
        native: {}
    });
}

function setConnected(_isConnected) {
    if (isConnected !== _isConnected) {
        isConnected = _isConnected;
        adapter.setState('info.connection', {val: isConnected, ack: true});
    }
}

function checkStatus() {
    ping.probe(ip, {log: adapter.log.debug}, function (err, result) {
        if (err) {
            adapter.log.error(err);
        }
        if (result) {
            setConnected(result.alive);
            if (result.alive) {
                request(getOptions, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        try {
                            data = JSON.parse(body);
                            evaluateResponse();
                        } catch (e) {
                            adapter.log.warn(e);
                        }
                    }
                });
            }
        }
    });
}

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:

    ip = adapter.config.ip;
    pin = adapter.config.pin;

    if (ip && pin && pin.match(/^\d{4}$/)) {

        getOptions = {
            url: "http://" + ip + ":80/jsondata.cgi",
            type: "GET",
            headers: {"Authorization": 'Basic ' + new Buffer('admin:' + pin).toString('base64')}
        };

        adapter.subscribeStates("mower.start");
        adapter.subscribeStates("mower.stop");

        createInfoObjects();

        let secs = adapter.config.poll;
        if (isNaN(secs) || secs < 1) {
            secs = 10;
        }

        setInterval(checkStatus, secs * 1000);

    } else {
        adapter.log.error("Please configure the Landroid Adapter");
    }
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 

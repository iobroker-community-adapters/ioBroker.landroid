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
var utils = require(__dirname + "/lib/utils"); // Get common adapter utils
var http = require("http");
var ping = require("ping");

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.adapter("landroid");

var options = {};

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

    if (!state && id === adapter.namespace + "mower.state.5") {
        adapter.setState("mower.charging", {val: false, ack: true});
        adapter.setState("mower.chargingComplete", {val: false, ack: true});
    }

    if (!state) {
        return;
    }

    if (id === adapter.namespace + ".mower.start") {
        startMower();
    }
    else if (id === adapter.namespace + ".mower.stop") {
        stopMower();
    }
    else if (id === adapter.namespace + "mower.state.5" && !adapter.getState("mower.state.13")) {
        adapter.setState("mower.charging", {val: true, ack: true});
    }
    else if (id === adapter.namespace + "mower.state.13" && adapter.getState("mower.state.5")) {
        adapter.setState("mower.charging", {val: false, ack: true});
        adapter.setState("mower.chargingComplete", {val: true, ack: true});
    }

});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on("message", function (obj) {
    if (typeof obj == "object" && obj.message) {
        if (obj.command == "send") {
            // e.g. send email or pushover or whatever
            console.log("send command");

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, "Message received", obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on("ready", function () {
    main();
});

function startMower(){
    adapter.setState("mower.start", {val: false});
}

function stopMower(){
    adapter.setState("mower.stop", {val: false});
}

function evaluateArray(alarm, name) {
    for (var i = 0; i < arr.length; i++) {
        adapter.setState(name + i, {val: alarm[i] === 0, ack: true});
    }
}

function evaluateResponse(data) {
    adapter.setState("mower.firmware", {val: data.versione_fw, ack: true});
    adapter.setState("mower.batteryState", {val: data.perc_batt, ack: true});
    adapter.setState("mower.borderCut", {val: data.enab_bordo === 0, ack: true});
    evaluateArray(data.allarmi, "alarm.");
    evaluateArray(data.settaggi, "mower.state.");

}

function checkStatus() {
    ping.sys.probe(adapter.config.ip, function (isAlive) {
        adapter.setState("mower.connected", {val: isAlive, ack: true});
        if (isAlive) {
            var req = http.get(options, function (res) {
                res.setEncoding("utf8");
                res.on("data", function (data) {
                    console.log(data);
                    evaluateResponse(JSON.parse(data));
                });
            });
        }
    });
}

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:


    options = {
        host: adapter.config.ip,
        port: "80",
        path: "/jsondata.cgi",
        method: "GET",
        headers: {
            "Authorization": "Basic " + new Buffer("admin:" + adapter.config.pin).toString("base64")
        }
    };

    adapter.subscribeStates("mower.start");
    adapter.subscribeStates("mower.stop");
    adapter.subscribeStates("mower.state.5");
    adapter.subscribeStates("mower.state.13");

    setInterval(checkStatus, adapter.config.poll * 1000);

}

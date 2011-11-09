#!/usr/bin/env node

var fs = require('fs');
var async = require('./async');
var cli = require('./cli');


/*** Initialize ***/
cli.option_width = 30;
cli.setUsage(cli.app + " [OPTIONS] http://www.example.com:8080/foo/bar");

// Parse command line parameters
cli.parse({
    method: ['m', 'HTTP Method to use', 'string', 'POST'],
    concurrency: ['c', 'Number of concurrent requests', 'int', 1],
    num_requests: ['n', 'Number of requests', 'int', 10],
    payload: ['p', 'Payload File', 'file'], 
    key: ['k', 'Key file', 'file'],             // 'somekey.key'
    cert: ['r', 'Certificate file', 'file'],    // 'somecert.crt'
    dump: ['d', 'Dump responses'],
});


// Read in ALL the files
var payload, key, cert;

if(cli.options.payload) {
    try {
        payload = fs.readFileSync(cli.options.payload, 'utf8');
    }
    catch(err) {
        console.log("Payload file missing or empty  [" + err + "]");
        console.log(cli.getUsage());
        process.exit(1);
    };
}

if(cli.options.key) {
    try {
        key = fs.readFileSync(cli.options.key, 'utf8');
    }
    catch(err) {
        console.log("Key file missing or empty  [" + err + "]");
        console.log(cli.getUsage());
        process.exit(1);
    };
}

if(cli.options.cert) {
    try {
        cert = fs.readFileSync(cli.options.cert, 'utf8');
    }
    catch(err) {
        console.log("Cert file missing or empty  [" + err + "]");
        console.log(cli.getUsage());
        process.exit(1);
    };
}


// URL Parsing
if(! cli.args[0]) {
    console.log(cli.getUsage());
    process.exit(1);
}

var urlParts = cli.args[0].match(/^(https?)\:\/\/([^\:\/]+)(\:(\d+))?(.*)$/i);
if(!urlParts) {
    console.log('Invalid URL');
    console.log(cli.getUsage());
    process.exit(1);
}



/*** Main work done below ***/

// Initialize the http request options
var options = {
    host: urlParts[2],
    port: parseInt(urlParts[4] || '80', 10),
    path: urlParts[5] || '/',
    method: cli.options.method,
    key: key,
    cert: cert,
    headers: {},
};

if(payload) {
    options['headers']['Content-Length'] = payload.length;
}

// Require the 'http' or 'https' modules depending on the url
var HTTP = require(urlParts[1].toLowerCase());


// Main queue that handles all the magic concurrency (async is a godsend)
var queue = async.queue( do_request, cli.options.concurrency);

// Fired when the queue is finished
queue.drain = function() {
    console.log("Minimum Elapsed Time (ms): ", min_elapsed);
    console.log("Maximum Elapsed Time (ms): ", max_elapsed);
    console.log("Total Elapsed Time (ms): ", elapsed_total);
    console.log("Average Elapsed Time (ms): ", (elapsed_total / cli.options.num_requests));
};


// Pump that queue with all the requests
for(var i=0, stop=cli.options.num_requests; i<stop; i++) {
    queue.push(i);
}

// Useful for the progress bar
var done_count = 0;
var elapsed_total = 0;
var max_elapsed = undefined;
var min_elapsed = undefined;

// do_request handles a single request to the server
function do_request(task, callback) {
    var req = HTTP.request(options, function(res) {
        if(cli.options.dump) {
            console.log('== TASK ', task, ' ==');
            console.log('statusCode: ', res.statusCode);
            console.log('headers: ', res.headers);
            console.log('\n');
        }

        var buffer = '';
        res.on('data', function(d) {    // concat chunk data
            buffer += d;
        });

        res.on('end', function() {      // process the data
            var elapsed = (new Date().valueOf()) - req.start_time;
            elapsed_total += elapsed;

            if((min_elapsed === undefined) || (min_elapsed > elapsed)) { min_elapsed = elapsed; }
            if((max_elapsed === undefined) || (max_elapsed < elapsed)) { max_elapsed = elapsed; }

            if(cli.options.dump) {
                console.log(buffer, '\n========\n');
            }

            // update the pretty progress bar
            cli.progress( ++done_count / cli.options.num_requests);

            // async.queue requires the callback be called
            callback();
        });
    });

    // send the payload
    if(payload) {
        req.write(payload);
    }

    req.on('error', function(e) {
        console.error(e);
    });

    req.start_time = new Date().valueOf();
    req.end();
}

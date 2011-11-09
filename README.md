# postpound node script
*by Charles Daniel*

## License
Public Domain - Use at your own risk

## Description
A simple node based script to hammer away at a given URL using POST requests with a given payload and any key/cert combination. It also allows for simple GET requests (defaults to POST).

## Usage
* To see the help screen
    node postpound -h 

* To do a simple GET request
    node -m GET http://www.google.com/ 

* To see the output of that GET request use a `-d`
    node -m GET -d http://www.google.com/

* To POST to a URL create a payload file containing data
    node --payload=payloadFile http://www.example.com/somescript.cgi

* To POST with key/cert credentials
    node --payload=payloadFile --key=keyfile.key --cert=certfile.crt http://www.example.com/somescript.cgi

* To specify the number of requests use `-n`
    node -n 10 http://www.example.com

* To specify the concurrency use `-c`
    node -c 2 http://www.example.com

* If you specify both `-n` and `-c`, the n requests will be the total requests (shared by the concurrent attempts)
    node -c 2 -n 10 http://www.example.com



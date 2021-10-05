var express = require('express');
var app = express();
var httpProxy = require('http-proxy');
var https = require('https');
const fs = require('fs');
const colors = require('colors/safe');
const path = require('path');


global.__basedir = __dirname + '/';

console.log(colors.red(`working directory ${__dirname}`))

var apiProxy = httpProxy.createProxyServer();

let rawdata = fs.readFileSync(path.resolve(__dirname, 'proxy.conf.json'));
let config = JSON.parse(rawdata);
let servers = config.servers;

Object.keys(servers).forEach(function (key) {
    var server = servers[key];
    console.log(colors.bold(`url mapping for ${key} => ${server.target} `))
    app.all(key, function (req, res) {
        try {
            console.log(colors.cyan(`redirecting ${req.url} to  ${server.name} on ${server.target} `));
            apiProxy.web(req, res, {target: server.target}, function (e) {
                console.log(e.message);
                return res.status(500).send({
                    error: true,
                    message: e.message
                });
            });
        } catch (e) {
            console.log(e);
        }
    });
});


let webRoot = path.resolve(__dirname, 'dist');
console.log(colors.green(`web root is ${webRoot}`))
app.use(express.static(webRoot));
app.route('*').get(function (req, res) {
    console.log(colors.bgYellow(`redirecting ${req.url}  `));
    res.sendFile('index.html', {
        root: webRoot
    });
});


if (config.secure) {
    let options = {
        pfx: fs.readFileSync(path.resolve(__dirname, config.tls.pfx)),
        passphrase: config.tls.passphrase,
        alias: config.tls.alias
    };
    var httpsServer = https.createServer(options, app);
    httpsServer.listen(config.port, config.host, function () {
        console.log(colors.blue(`server listen at https://${config.host}:${config.port}`));
    });
} else {
    app.listen(config.port, config.host, function () {
        console.log(colors.green(`server listen at http://${config.host}:${config.port}`));
    });
}


process.on('uncaughtException', err => {
    console.error('uncaughtException', err.stack);
});

process.on('unhandledRejection', err => {
    console.error('unhandledRejection', err.stack);
});
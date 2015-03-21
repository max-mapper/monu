### Monu

<p>Monu is an open source process monitoring menu bar application for Mac OS. You can configure Monu to launch programs, and when Monu starts up it will start them. Additionally, it will monitor the processes and restart them if they crash.</p>

<p>Monu is a portmanteau of 'monitor' and 'menu'. It has two C/C++ dependencies, [Atom Shell](https://github.com/atom/atom-shell) (which includes iojs) and the [mon](https://github.com/tj/mon) process monitor.</p>

<p>To download the latest version visit the [releases page](https://github.com/maxogden/monu/releases)</p>

![screenshot.png](screenshot.png)

##### How to use Monu
<p>To configure Monu, click 'Open Config Folder' and open 'config.json' in a text editor. When you save and return to Monu your new configuration will be automatically loaded.</p>
<p>Be sure your JSON syntax is valid when editing the configuration. Here are supported options. These should be added as top level key/value pairs to 'config.json':</p>
<ul>
  <li><b>processes</b> the processes to run (see below)</li>
  <li><b>logs</b> the directory to store logs in (default config/pids)</li>
  <li><b>pids</b> the directory to store PIDs in (default config/logs)</li>
  <li><b>on-error</b> a command to run when a process cannot start (default none)</li>
  <li><b>on-restart</b> a command to run when a process restarts (default none)</li>
  <li><b>sleep</b> sleep seconds before re-executing (default 1)</li>
  <li><b>attempts</b> restart attempts within 60 seconds before stopping app (default 10)</li>
  <li><b>prefix</b> add a string prefix to the log (default none)</li>
</ul>

##### Adding Processes
<p>In the 'config.json' file add processes to the 'processes' key. The key must be a name (lowercase letters and hypens) and the value must be the launch command. For example:<p>

```json
{
  "logs": "./logs",
  "pids": "./pids",
  "processes": {
    "web-1": "http-server . -p 8081",
    "web-2": "http-server . -p 8082",
    "web-3": "http-server . -p 8083"
  }
}
```

##### Launch on Startup
<p>When you open Monu.app, it will start all configured processes.</p>
<p>If you would like Monu.app to start when your Mac starts up, got to <b>System Preferences &gt; Users and Groups</b> and add Monu.app to <b>Login Items</b> for your User.</p>

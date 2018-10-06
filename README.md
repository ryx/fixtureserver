# fixtureserver
A minimalistic testing server to easily create and serve fixtures (i.e. _"simple testing pages with dummy or mock content to run tests on"_). Supports edge side includes (ESI) and embedded Javascript ([eJS](http://ejs.co)). Only intended for use within testing setups, pipelines or development!

## Setup
Install via npm (global or local)

    npm install -g fixtureserver

Then either start using commandline (and optionally pass `--docroot`, `--host` and `--port` as arguments) ...

    fixtureserver --docroot=./your-docroot --host=localhost --port=9999

... or directly require and use within your node.js application as module

```javascript
const fixtureserver = require('fixtureserver');

fixtureserver.start({
  docroot: './your-docroot',
  host: 'localhost',
  port: 9999,
});
```


## Usage
Put HTML fixture files in your docroot, then start the server and open the default location (http://localhost:8000). The fixtures can use ESI statements as well as the full feature set of [embeddedJS](http://ejs.co). A simple example might look like this:

```xml
  <!doctype html>
  <html>
  <body>
    Here we include some external file:
    <%- include('_header'); -%>

    The following is an edge side include:
    <esi:include src="http://example.com/some/remote/chunk.html" />

    Let's add some more fancy embedded Javascript (anyone feels reminded of PHP? ;) ..):
    <% if (server) { %>
      <i>server-esi v<%= server.version %></i>
    <% } %>

    <%- include('_footer'); -%>
  </body>
  ```

The include files `_header.ejs` and `_footer.ejs` (the extension is omitted in the include statement) are expected relative to the fixture's location. This makes it pretty convenient to serve a generic header or footer within your fixtures.


## History
This tool is based on a very quick&dirty testing setup that we needed for functionally testing a set of server-side includes (SSI). We needed a setup that allowed us to run a functional test against the finally rendered and embedded includes. It should also handle some sort of dynamic scripting to allow stuff like includes and data mocking without too much repetition. This server does exactly that.

Why we chose ESI over SSI? SSIs may not contain a domain and therefore require a fairly complex setup using a local nginx as reverse proxy. That made everything unnecessarily complicated when just testing the integration. So we finally ditched the SSI in this setup (after wasting way too much time for 3 years).


## License
MIT License, (c) Rico Pfaus 2018
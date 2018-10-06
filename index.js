/**
 * Testing server that serves any files inside its docroot and resolves
 * embedded Javascript (EJS) and ESI includes inside HTML files (much
 * like a PHP server would parse and execute PHP).
 *
 * It also offers a very minimalistic directory browsing feature for
 * simplifying local development of fixtures.
 *
 * (c) 2018 Rico Pfaus <http://github.com/ryx/fixtureserver>
 */
const Hapi = require('hapi');
const ESI = require('nodesi');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// server config
const serverDocroot = process.env.DOCROOT || path.join(__dirname, '/docroot');
const serverHost = process.env.HOST || 'localhost';
const serverPort = process.env.PORT || 8000;

// create ESI processor instance
const esi = new ESI();

// Create a server with a host and port
const server = Hapi.server({
  host: serverHost,
  port: serverPort,
});

/**
 * Converts a given path- or filename to a path relative to the server docroot
 * (i.e. strips leading docroot).
 * @param {String} pathName the path to be relativized
 */
function relativizePathName(pathName) {
  return pathName.replace(new RegExp(`^${serverDocroot.replace(/\//, '\\/')}`, 'gi'), '');
}

/**
 * Converts a given path- or filename to an absolute path (i.e. prepends docroot).
 * @param {String} pathName the path to be absolutized
 */
function absolutizePathName(pathName) {
  if (pathName.match(new RegExp(`^${serverDocroot.replace(/\//, '\\/')}`, 'gi'))) {
    return pathName;
  }
  return path.join(serverDocroot, pathName);
}

/**
 * Returns the parent directory for the given path or file.
 * @param {String} pathName path- or filename to get the parent for
 */
function getParentDirectory(pathName) {
  const parts = pathName.split('/');
  if (parts.length === 1) {
    return '/';
  }
  parts.pop();

  return parts.join('/');
}

function renderSystemPageFrame(html) {
  return `<!doctype html>
  <html>
  <head>
    <style>
    body {
      font-size: 14px;
      font-family: monospace;
      line-height: 1.4rem;
    }
    ul {
      list-style: none;
    }
    </style>
  </head>
  <body>${html}</body>
  </html>
  `;
}

/**
 * Render a directory tree for the given pathName.
 * @param {String} pathName the pathName (relative the server docroot)
 */
async function renderPath(pathName) {
  const absolutePath = absolutizePathName(pathName);
  const relativePath = relativizePathName(pathName);
  let html = `<li><a href="${getParentDirectory(relativePath)}">/..</a></li>`;

  const files = fs.readdirSync(absolutePath);
  if (!files) {
    throw new Error(`Path listing failed for: ${pathName}`);
  }

  files.forEach((file) => {
    const absoluteFile = path.join(absolutePath, file);
    const stats = fs.statSync(absoluteFile);
    if (!stats) {
      throw new Error(`Stats failed for: ${absoluteFile}`);
    }
    html += `<li><a href="${relativePath}/${file}">/${file}${stats.isDirectory() ? '/' : ''}</a></li>`;
  });

  return renderSystemPageFrame(`<ul>${html}</ul>`);
}

/**
 * Render the given file and return it's HTML.
 * @param {String} fileName
 */
async function renderFile(fileName) {
  let html = '';

  // load file data
  const fileContent = fs.readFileSync(fileName);
  html = '';
  if (fileContent) {
    html = fileContent.toString();
  }

  // pass it through ejs (@FIXME: handle errors)
  html = ejs.render(html, {
    // virtual data
    server: {
      version: '0.0.1',
      dirname: serverDocroot,
    },
    require,
  }, {
    // EJS options
    filename: fileName,
  });

  // pass it through ESI processor to resolve remote includes
  html = await esi.process(html);
  if (!html) {
    throw new Error(`ESI processing failed for: ${fileName}`);
  }

  return html;
}

// Add the route
server.route({
  method: 'GET',
  path: '/{filename*}',
  async handler(request, h) {
    try {
      let html = '';
      const targetFile = path.join(serverDocroot, request.params.filename);
      console.log(`Requested: ${targetFile}`);

      // check existence
      const stats = fs.statSync(targetFile);
      if (!stats) {
        h.status = 404;
        return h.response('server-esi: file not found');
      }

      // render contents
      if (stats.isDirectory()) {
        html = await renderPath(request.params.filename);
      } else {
        html = await renderFile(targetFile);
      }

      // return result
      h.status = 200;
      return h.response(html);
    } catch (e) {
      // bulk handle all errors
      h.status = 500;
      return h.response(e.message);
    }
  },
});

// Start the server
async function start() {
  try {
    await server.start();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
  console.log('IMPORTANT: this server likely contains security errors and is NOT intended for production use!');
  console.log('Server running at:', server.info.uri);
}

module.exports = {
  start,
};

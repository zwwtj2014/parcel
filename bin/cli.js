#!/usr/bin/env node
console.log(
  "Congratulations, you're using the shawwn-user-test feature branch."
);
console.log(
  'Now revert to master: https://github.com/parcel-bundler/parcel/wiki/HEAD'
);
console.log('Parcel will now exit.');
process.exit();

// Node 8 supports native async functions - no need to use compiled code!
module.exports =
  parseInt(process.versions.node, 10) < 8
    ? require('../lib/cli')
    : require('../src/cli');

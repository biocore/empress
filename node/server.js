const express     = require('express');
const bodyparser  = require('body-parser');

const app = express();
const port = 3000;
app.listen(port, function() {
  console.log('Live on ' + port);
});

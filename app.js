var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const { generateMessage, generateLocationMessage } = require('./message');

//Connection to mongoDB
mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

//Routes For Pages
var routes = require('./routes/index');
var users = require('./routes/users');

//Initilization of Express Middleware
var app = express();
var server = http.createServer(app);
var io = socketIO(server);

//View Engine for rendering pages
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'})); //Deafult Layout as set in /views/layout folder
app.set('view engine', 'handlebars');

//BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//Static Folder for Styles
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;

      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      };
    }
  }));

  // Connect Flash
  app.use(flash());

  // Global Vars
  app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
  });


  io.on('connection', (socket) => {
    console.log("New user connected ");

    socket.emit('newMessage', generateMessage('Admin', 'Welcome to the Chat App'));
    socket.broadcast.emit('newMessage', generateMessage('Admin', 'New User Connected'));

    socket.on('createMessage', (message, callback) => {
        console.log("Create Message", message);
        io.emit('newMessage', generateMessage(message.from, message.text));
        callback('');
        // socket.broadcast.emit('newMessage',{   //to emit event to every connected client excluding itself
        //         to:message.to,
        //         text:message.text,
        //         createdAt: new Date().getTime()
        //     });

        socket.on('createLocationMessage', (coords)=>{
            io.emit('newLocationMessage', generateLocationMessage('Admin', coords.latitude,coords.longitude))
        })

    });


    socket.on('disconnect', () => {
        console.log("Client Disconnected");
    });
});


  app.use('/', routes);
  app.use('/users', users);

  // Set Port
  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server started on ${port}`);
});

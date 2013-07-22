//region MODULE DEPENDENCIES

var express = require('express')
    , http = require('http')
    , mongoose = require('mongoose')
    , moment = require('moment')
    , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
//endregion

//region MONGODB CONNECTION CONFIGURATION
if(process.env.VCAP_SERVICES){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    var mongo = env['mongodb-1.8'][0]['credentials'];
}
else{
    var mongo = {
        "hostname":"localhost",
        "port":27017,
        "username":"",
        "password":"",
        "name":"",
        "db":"db"
    }
}
var generate_mongo_url = function(obj){
    obj.hostname = (obj.hostname || 'localhost');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');
    if(obj.username && obj.password){
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
    else{
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}
//endregion

//region MONGOOSE CONNECTION CONF.
var mongourl = generate_mongo_url(mongo);
mongoose.connect(mongourl);
//endregion

// region HTTP OPERATIONS

app.get('/api', function(req, res){
    res.send("API ver. 1.0");
});

//region MONGOOSE SCHEMAS && MODELS
var Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var UserSchema = new Schema({
    name : {type: String, required: true},
    surname: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true},
    email:{type: String, required: true},
    creDate:Date,
    modDate:Date,
    facebookID:String,
    twitterID: String,
    role:{
        rolename : {type: String, enum:['Visitor','Admin']}
    },
    //posts : [{type: ObjectId, ref:'BlogPost'}]
});
var User = mongoose.model('User',UserSchema);

var CommentSchema = new Schema({
    title : {type: String, required: true},
    body:{type: String, required: true},
    state: {type: String, enum:['online','offline']},
    creDate : {type: Date, default: Date.now},
    commentator: ObjectId
});
var Comment = mongoose.model('Comment',CommentSchema);

var BlogPostSchema = new Schema({
    title : {type: String, required: true},
    content: {type: String, required: true},
    creDate:Date,
    modDate:Date,
    imageURL:{type: String, required: true},
    state: {type: String, enum:['online','offline']},
    //author: {type: ObjectId, ref:'User'},
    author: Schema.Types.Mixed,
    comments: [ObjectId],
    tags : [{
        name: String,
        _id : false
    }]
});
var BlogPost = mongoose.model('BlogPost',BlogPostSchema);

//VALIDATION ERRORS
   // TODO: Validations

//MODEL WRAPPER OBJECT
var ModelWrapperSchema = new Schema({
      succeed : Boolean,
      message : String,
      data: Schema.Types.Mixed
}, { _id: false });
var ModelWrapper = mongoose.model('ModelWrapper',ModelWrapperSchema);
//endregion

//region CRUD OPERATIONS FOR USERS

// GET: /api/Users -> Returns All Users
app.get('/api/users', function (req, res){
    User.find(function(err, users){

        var outmodel = new ModelWrapper();

             if(!err){
                 if(users.length > 0){
                     outmodel.succeed = true;
                     outmodel.data =users;
                 }
                 else{
                     outmodel.succeed = false;
                     outmodel.message = "Veri tabanında kayıt yok!"
                 }
             }else{
                 outmodel.succeed = false;
                 outmodel.message = "Hata : " + err;
             }
        res.send(outmodel);
    });
});

// GET: /api/Users/:id -> Returns UserById
app.get('/api/users/:id', function (req, res){

    User.findById(req.params.id, function(err, user){

        var outmodel = new ModelWrapper();

        if(!err){
            if (user != null){
                outmodel.succeed = true;
                outmodel.data =user;

            }else{
                outmodel.succeed = false;
                outmodel.message = "Aradığınız kayıt bulunamadı!"
            }
        }
        else{
            outmodel.succeed = false;
            outmodel.message = "Hata : " + err;
        }
        res.send(outmodel);
    });
});

// POST: /api/Users -> Creates User
app.post('/api/users',function(req, res){

    var userObj = new User({
        name : req.body.name,
        surname: req.body.surname,
        username: req.body.username,
        password: req.body.password,
        email:req.body.email,
        creDate: Date.now(),
        facebookID:req.body.facebookID,
        twitterID: req.body.twitterID,
        role:req.body.role
    });

    userObj.save(function(err){

        var outmodel = new ModelWrapper();

        if(!err){
            outmodel.succeed = true;
            outmodel.data =userObj;
        }
        else{
            outmodel.succeed = false;
            outmodel.message = "Hata : " + err;
        }
        res.send(outmodel);
    });
});

// PUT: /api/Users/:id -> Updates User
app.put('/api/users/:id', function(req, res){

    User.findById(req.params.id, function(err, user){

        var outmodel = new ModelWrapper();

        if(!err){
            if (user != null){

                user.name = req.body.name;
                user.surname= req.body.surname;
                user.username= req.body.username;
                user.password= req.body.password;
                user.email=req.body.email;
                user.modDate=Date.now();
                user.facebookID=req.body.facebookID;
                user.twitterID= req.body.twitterID;
                user.role=req.body.role;

                user.save(function(err){
                    if(!err){
                        outmodel.succeed = true;
                        outmodel.data =user;

                    }
                    else{
                        outmodel.succeed = false;
                        outmodel.message = "Hata : " + err;
                    }

                    res.send(outmodel);
                });

            }else{
                outmodel.succeed = false;
                outmodel.message = "Aradığınız kayıt bulunamadı!"
                res.send(outmodel);
            }
        }
        else{
            outmodel.succeed = false;
            outmodel.message = "Hata : " + err;
            res.send(outmodel);
        }
    });


});
//endregion

//region CRUD OPERATIONS FOR BLOGPOSTS

// GET: /api/BlogPosts -> Returns All BlogPosts
app.get('/api/blogposts', function (req, res){
    BlogPost.find(function(err, blogPosts){
        var outmodel = new ModelWrapper();
        if(!err){
            if(blogPosts.length > 0){
                outmodel.succeed = true;
                outmodel.data =blogPosts;
            }
            else{
                outmodel.succeed = false;
                outmodel.message = "Veri tabanında kayıt yok!"
            }
        }else{
            outmodel.succeed = false;
            outmodel.message = "Hata : " + err;
        }
        res.send(outmodel);
    });
});

// GET: /api/BlogPosts/:id -> Returns BlogPostById
app.get('/api/blogposts/:id', function (req, res){

    BlogPost.findById(req.params.id, function(err, blogPost){

        var outmodel = new ModelWrapper();

        if(!err){
            if (blogPost != null){

                var query = User.findOne({_id : blogPost.author});
                //query.select('name surname _id');
                query.exec(function(err, user){
                    blogPost.author = user;
                    outmodel.succeed = true;
                    outmodel.data =blogPost;
                    res.send(outmodel);
                });

            }else{
                outmodel.succeed = false;
                outmodel.message = "Aradığınız kayıt bulunamadı!"
                res.send(outmodel);
            }
        }
        else{
            outmodel.succeed = false;
            outmodel.message = "Hata : " + err;
            res.send(outmodel);
        }

    });
});

// POST: /api/BlogPosts -> Creates BlogPost
app.post('/api/blogposts',function(req, res){

    var blogPostObj = new BlogPost({
        title : req.body.title,
        content: req.body.content,
        creDate: Date.now(),
        imageURL: req.body.imageURL,
        state: req.body.state,
        author: req.body.author,
        tags:req.body.tags
    });

    blogPostObj.save(function(err){

        var outmodel = new ModelWrapper();

        if(!err){
            outmodel.succeed = true;
            outmodel.data =blogPostObj;
        }
        else{
            outmodel.succeed = false;
            outmodel.message = "Hata : " + err;
        }
        res.send(outmodel);
    });
});

// PUT: /api/BlogPosts/:id -> Updates Blogpost
app.put('/api/blogposts/:id', function(req, res){

    BlogPost.findById(req.params.id, function(err, blogPost){

        var outmodel = new ModelWrapper();

        if(!err){
            if (blogPost != null){

                blogPost.title = req.body.title;
                blogPost.content = req.body.content;
                blogPost.modDate = Date.now();
                blogPost.imageURL = req.body.imageURL;
                blogPost.state = req.body.state;
                blogPost.author = req.body.author;
                blogPost.tags = req.body.tags;

                blogPost.save(function(err){
                    if(!err){
                        outmodel.succeed = true;
                        outmodel.data =blogPost;

                    }
                    else{
                        outmodel.succeed = false;
                        outmodel.message = "Hata : " + err;
                    }

                    res.send(outmodel);
                });

            }else{
                outmodel.succeed = false;
                outmodel.message = "Aradığınız kayıt bulunamadı!"
                res.send(outmodel);
            }
        }
        else{
            outmodel.succeed = false;
            outmodel.message = "Hata : " + err;
            res.send(outmodel);
        }
    });


});
//endregion

// DELETE: /api/Entity/:id  -> Deletes Entity
    //TODO: Yapılacak...

// endregion

// region CREATE SERVER
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
// endregion
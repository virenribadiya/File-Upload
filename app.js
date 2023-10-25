// importing requirements
import { rateLimit } from 'express-rate-limit';
const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const multer = require('multer');
const csvtojson = require('csvtojson');
const path = require('node:path');

// using requirements
const app = express();
app.use(express.urlencoded({extended:true}));
app.use(cors());
app.use(express.json());
app.use(express.static('excelUploads')); 

var limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// apply rate limiter to all requests
app.use(limiter);

// mongodb connection
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://localhost:27017/fileUploadDemoDB");

const studentSchema = mongoose.Schema({
    name : {
        type : String,
        required : true
    },
    email : {
        type: String,
        required : true
    },
    class : {
        type: String, 
        required: true
    }
});

const Student = mongoose.model("students",studentSchema);

// Now, Multer comes into the picture.
var excelStorage = multer.diskStorage({  
    destination: function(req,file,cb){  
        return cb(null,'./excelUploads');      // file added to the excelUploads folder of the root directory
    },  
    filename:function(req,file,cb){  
        return cb(null,file.originalname);  
    }  
});  
var excelUploads = multer({storage:excelStorage}); 


//=========================REST API=======================================

app.get("/",function(request,response){
    const schemaLocation = path.resolve('__dirname', 'schema.graphql');
    const subgraph = readFileSync(schemaLocation).toString();
    response.sendFile(__dirname+"/index.html");
});

// upload excel file and import in mongodb
app.post('/uploadExcelFile', 
    excelUploads.single("uploadfile"), 
    function(req, res){
        console.log(req.file);  
        
        function importFile(filePath){
            //  Read Excel File to Json Data
            var arrayToInsert = [];
            csvtojson().fromFile(filePath).then(function(source){
            // Fetching the all data from each row
                for (var i = 0; i < source.length; i++) {
                    console.log(source[i]["name"])
                    var singleRow = {
                        name: source[i]["name"],
                        email: source[i]["email"],
                        class: source[i]["class"],
                    };
                    arrayToInsert.push(singleRow);
                }
                //inserting into the table student
                Student.insertMany(arrayToInsert, function(error, result){
                    if (error) console.log(error);
                    if(result){
                        console.log("File imported successfully.");
                        res.redirect('/');
                    }
                });
            });
        }
        importFile(__dirname+'/excelUploads/' + req.file.filename);
    }
);

app.listen("3006",function(){
    console.log("http://localhost:3006/");
})

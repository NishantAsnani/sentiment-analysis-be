const dotenv = require('dotenv');
const express=require('express');
const bodyParser=require('body-parser');
const cors=require('cors');
const app=express();
const router=require('./api/index.js');

dotenv.config();


app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.use(cors());

app.use('/api',router);







const PORT=process.env.PORT || 3000;


app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
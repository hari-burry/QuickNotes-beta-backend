const cors = require('cors');
const express = require('express');
const app = express();
app.use(cors());
require('dotenv').config();
const { MongoClient } = require('mongodb');
const url = process.env.MONGO_URL;
const AWS = require('aws-sdk');
AWS.config.update({ 
   region: process.env.AWS_REGION, 
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY 


});
const s3 = new AWS.S3();



const DBpick = async (subject) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    console.log('connected successfully');

    const database = client.db('bamba');
    const bucket = await database.listCollections({ name: subject }).toArray();
    if (bucket.length > 0) {
      console.log('subject exists');
      console.log(bucket.length);
      const collection = database.collection(subject);
      const subarr = await collection.find({}).toArray();
      subarr.forEach((el) => {
        console.log(el);
      });

      

      return subarr;
    } else {
      console.log('subject invalid');
      console.log(bucket.length);
      return [];
    }
  } catch (error) {
    console.log(error);
    return [];
  } finally {
    await client.close();
  }
};

async function geturl(par) {
  const url = await s3.getSignedUrlPromise('getObject', par); // Use getSignedUrlPromise for promises
  return url;
}

app.get('/sub', async (req, res) => {
  const text = req.query.text;
  const ans = await DBpick(text);
  if (ans.length === 0) {
    console.log('invalid bro');
    res.status(400).json('invalid url');
    return;
  }

  const URLarr =await Promise.all(ans.map(async (e) => {
    if(e.name==='title'){
      const obj={
        type: e.name,
        name:e.objkey,
      rank:e.rank,
      }
      return obj;
    }
    else{
    const params = {
      Bucket: 'subjectstore',
      Key: ''+e.objkey,
      Expires: 300
    };
    const url = await geturl(params);
    const meta = {
      type: e.name,
      rank:e.rank,
      link: url
    };
    return meta;
    }
  }));

  res.json(URLarr);

});


async function subfind(substr){
     const client=new MongoClient(url);
     try{
       await client.connect();
       console.log("connected to the database");
     
   
     if(substr){
     const dbms=client.db('bamba');
     const col=dbms.collection('subnames');
     const pattern=new RegExp(`^${substr}`,'i');
     const docs=await col.find({sname:{$regex:pattern}}).toArray();
     return docs;
     }
     return [];

     }
     catch(err){
      console.log(err);
    }
     finally{
      await client.close();
     }




    
}

app.get('/sugbox',async (req,res)=>{
  const str=req.query.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const array= await subfind(str);
 if(array.length===0){
   console.log('no result');
  res.json([{name:"no results"}]);
 }
 else{
 console.log(array);
 res.json(array);
 }



})

app.get('/',(req,res)=>{
res.send("hello bros");
})



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});











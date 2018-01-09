let fs = require('fs');
const timeStamp = require('./time.js').timeStamp;
const http = require('http');
const WebApp = require('./webapp');

let registered_users = [{userName:'bhanutv',name:'Bhanu Teja Verma'},{userName:'harshab',name:'Harsha Vardhana'}];
// let toStr = obj=>JSON.stringify(obj,null,2);

const getContentType=function(extension){
  let contentType={
    '.html':'text/html',
    '.js':'text/js',
    '.css':'text/css',
    '.jpeg':'image/jpeg',
    '.jpg':'image/jpg',
    '.gif':'image/gif',
    '.pdf':'application/pdf',
  }
  return contentType[extension];
};

const setContentType=function(fileUrl,res){
  let extension=fileUrl.slice(fileUrl.lastIndexOf('.'));
  let contentType=getContentType(extension);
  res.setHeader('content-type',contentType);
};

const writeToFile=function(content,filename){
  let existingData=fs.readFileSync(filename,'utf8');
  let newData=JSON.parse(existingData);
  newData.unshift(content);
  fs.writeFileSync(filename,JSON.stringify(newData));
};

const writeComments=function(filename,res){
  let dbContent=JSON.parse(getFileContent(filename));
  dbContent.forEach(function(commentData){
    dbContent=`<pre>${commentData.date} ${commentData.name} ${commentData.comment}</pre>`;
    res.write(dbContent);
  });
};

let logRequest = (req,res)=>{
  console.log(`${timeStamp()} ${req.method} ${req.url}`);
}

let loadUser = (req,res)=>{
  let sessionid = req.cookies.sessionid;
  let user = registered_users.find(u=>u.sessionid==sessionid);
  if(sessionid && user){
    req.user = user;
  }
};

const serveContent=function(fileUrl){
  if(fs.existsSync(fileUrl)){
    try{
      let fileContent=fs.readFileSync(fileUrl);
      setContentType(fileUrl,this);
      this.write(fileContent);
      this.end();
    }catch(ex){}
  }
};

let servePage=function(req,res){
  let fileUrl='./public'+req.url;
  serveContent.call(res,fileUrl);
};

let app = WebApp.create();

app.use(logRequest);
app.use(loadUser);
app.get('/guestBook.html',(req,res)=>{
  serveContent.call(res,'./public/guestBook.html');
  let dbFile='./data/commentDatabase2.txt';
  writeComments(dbFile,res);
});
app.post('/guestBook.html',(req,res)=>{
  let user = registered_users.find(u=>u.userName==req.body.userName);
  if(!user) {
    res.setHeader('Set-Cookie',`logInFailed=true`);
    document.getElementsByClassName('loginStatusBlock').innerText="Login Failed";
    return;
  }
  let sessionid = new Date().getTime();
  res.setHeader('Set-Cookie',`sessionid=${sessionid}`);
  user.sessionid = sessionid;

  let date=new Date();
  let dbFile='./data/commentDatabase2.txt';
  date=date.toLocaleString();
  req.body.date=date;
  writeToFile(req.body,dbFile);
  res.redirect('/guestBook.html');
});
app.postprocess(servePage);

const PORT = 5000;
let server = http.createServer(app);
server.on('error',e=>console.error('**error**',e.message));
server.listen(PORT,(e)=>console.log(`server listening at ${PORT}`));

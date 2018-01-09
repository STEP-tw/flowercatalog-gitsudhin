let fs = require('fs');
const timeStamp = require('./time.js').timeStamp;
const http = require('http');
const WebApp = require('./webapp');

let registered_users = [{userName:'sudhin',name:'Sudhin MN'}];
let toStr = obj=>JSON.stringify(obj,null,2);

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

const getFileContent=function(file,encoding='utf8'){
  return fs.readFileSync(file,encoding);
};

const writeToFile=function(content,filename){
  console.log('Entering');
  let existingData=getFileContent(filename);
  let newData=JSON.parse(existingData);
  newData.unshift(content);
  fs.writeFileSync(filename,JSON.stringify(newData,null,2));
};

const writeComments=function(filename,res){
  let dbContent=JSON.parse(fs.readFileSync(filename));
  dbContent.forEach(function(commentData){
    dbContent=`<pre>${commentData.date} ${commentData.name} ${commentData.comment}</pre>`;
    res.write(dbContent);
  });
};

let logRequest = (req,res)=>{
  console.log(`${timeStamp()} ${req.method} ${req.url}`);
  console.log(`COOKIES=> ${toStr(req.cookies)}`);
  console.log(`BODY=> ${toStr(req.body)}`);

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

const parseToHTML=function(commentsList){
  let content="";
  commentsList.forEach( (comment)=>{
    content+=`<pre>${comment.date} ${comment.name} ${comment.comment}</pre>`
  });
  return content;
};

let app = WebApp.create();

app.use(logRequest);
app.use(loadUser);
app.get('/login',(req,res)=>{
  res.setHeader('Content-type','text/html');
  if(req.cookies.logInFailed){
    res.write('<p>Login Failed</p>');
  }
  res.write('<form method="POST"> <input name="userName"><input name="place"> <input type="submit"></form>');
  res.end();
});
app.post('/login',(req,res)=>{
  let user = registered_users.find(u=>u.userName==req.body.userName);
  if(!user) {
    res.setHeader('Set-Cookie',`logInFailed=true`);
    res.redirect('/login');
    return;
  }else{
    res.setHeader('Set-Cookie',`logInFailed=false`);
    res.redirect('/login');
    return
  }
  let sessionid = new Date().getTime();
  res.setHeader('Set-Cookie',`sessionid=${sessionid}`);
  user.sessionid = sessionid;
  res.redirect('/guestBook.html');
});
app.get('/guestBook.html',(req,res)=>{
  let dbFileContent=JSON.parse(getFileContent('./data/comments.json'));
  let fileContent=getFileContent('./public/guestBook.html');
  let parsedDb=parseToHTML(dbFileContent);
  fileContent=fileContent.replace('USERDATA',parsedDb);
  if(req.user){
    fileContent=fileContent.replace('Hello User',`Hello ${req.user.name}`);
  }
  res.write(fileContent);
  res.end();
});
app.post('/guestBook.html',(req,res)=>{
  let user = registered_users.find(u=>u.userName==req.body.name);
  if(!user) {
    res.setHeader('Set-Cookie',`logInFailed=true`);
    res.redirect('/login');
    return;
  }else{
    res.setHeader('Set-Cookie',`logInFailed=false`);
  }
  let sessionid = new Date().getTime();
  res.setHeader('Set-Cookie','sessionid=${sessionid}');
  user.sessionid = sessionid;

  let date=new Date();
  let dbFile='./data/comments.json';
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

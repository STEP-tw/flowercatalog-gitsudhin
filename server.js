let fs = require('fs');
const timeStamp = require('./time.js').timeStamp;
const http = require('http');
const WebApp = require('./webapp');

let registered_users = [{userName:'sudhin',name:'Sudhin MN'}];


let toStr = obj=>JSON.stringify(obj,null,2);

let logRequest = (req,res)=>{
  let text = ['------------------------------',
    `${timeStamp()}`,
    `${req.method} ${req.url}`,
    `HEADERS=> ${toStr(req.headers)}`,
    `COOKIES=> ${toStr(req.cookies)}`,
    `BODY=> ${toStr(req.body)}`,''].join('\n');
  fs.appendFile('request.log',text,()=>{});

  console.log(`${req.method} ${req.url}`);
}

let loadUser = (req,res)=>{
  let sessionid = req.cookies.sessionid;
  let user = registered_users.find(u=>u.sessionid==sessionid);
  if(sessionid && user){
    req.user = user;
  }
};

let servePage=function(req,res){
  let fileUrl='./public'+req.url;
  if(fs.existsSync(fileUrl)){
    try{
      let fileContent=getFileContent(fileUrl,null);
      setContentType(fileUrl,res);
      res.write(fileContent);
      res.end();
    }catch(ex){}
  }
};

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

const parseToHTML=function(commentsList){
  let content="";
  commentsList.forEach( (comment)=>{
    content+=`<pre>${comment.date} ${comment.name} ${comment.comment}</pre>`
  });
  return content;
};

const getLoginPage=function(req,res){
  let fileContent=getFileContent('./public/login.html');
  res.setHeader('Content-type','text/html');
  if(req.cookies.logInFailed){
    res.write('<p>Login</p>');
  }
  res.write(fileContent);
  res.end();
};

const validatePostUserData=function(req,res){
  let user = registered_users.find(u=>u.userName==req.body.userName);
  if(!user) {
    res.setHeader('Set-Cookie',`logInFailed=true`);
    res.redirect('/login.html');
    return;
  }
  let sessionid = new Date().getTime();
  res.setHeader('Set-Cookie',`sessionid=${sessionid}`);
  user.sessionid = sessionid;
  res.redirect('/guestBook.html');
};

const serveGuestBookPage=function(req,res){
  let dbFileContent=JSON.parse(getFileContent('./data/comments.json'));
  let fileContent=getFileContent('./public/guestBook.html');
  let parsedDb=parseToHTML(dbFileContent);
  fileContent=fileContent.replace('USERDATA',parsedDb);
  if(req.user){
    fileContent=fileContent.replace('Hello User',`Hello ${req.user.name}`);
    fileContent=fileContent.replace('hidden','visible');
    fileContent=fileContent.replace('Visible','hidden');
  }
  res.write(fileContent);
  res.end();
};

const addNewComment=function(req,res){
  if(!req.user) {
    res.setHeader('Set-Cookie',`logInFailed=true`);
    res.redirect('/login.html');
    return;
  }

  let date=new Date();
  let dbFile='./data/comments.json';
  date=date.toLocaleString();
  req.body.date=date;
  writeToFile(req.body,dbFile);
  res.redirect('/guestBook.html');
};

let app = WebApp.create();

app.use(logRequest);
app.use(loadUser);

app.get('/',(req,res)=>{res.redirect('index.html')});
app.get('/login.html',getLoginPage);
app.post('/login.html',validatePostUserData);
app.get('/guestBook.html',serveGuestBookPage);
app.post('/guestBook.html',addNewComment);
app.get('/logout',(req,res)=>{
  res.setHeader('Set-Cookie',[`loginFailed=false,Expires=${new Date(1).toUTCString()}`,`sessionid=0,Expires=${new Date(1).toUTCString()}`]);
  delete req.user.sessionid;
  res.redirect('/guestBook.html');
});

app.postprocess(servePage);

const PORT = 5000;
let server = http.createServer(app);
server.on('error',e=>console.error('**error**',e.message));
server.listen(PORT,(e)=>console.log(`server listening at ${PORT}`));

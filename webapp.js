
let redirect = function(path){
  console.log(`redirecting to ${path}`);
  this.statusCode = 302;
  this.setHeader('location',path);
  this.end();
};

let invoke = function(req,res){
  // console.log(this._handlers['POST']);
  let handler = this._handlers['POST'][req.url];
  if(!handler){
    fileNotFoundAction(res);
    return;
  }
  console.log('hi',handler(req,res));
  handler(req,res);
};

let urlIsOneOf = function(urls){
  return urls.includes(this.url);
}

const accumulate = (obj,keyAndValue)=> {
  let parts = keyAndValue.split('=');
  obj[parts[0].trim()] = parts[1].trim();
  return obj;
};

const parseBody = function(text){
  try{
    let parsedObj=text.split('&').reduce(accumulate,{});
    return text && parsedObj|| {};
  }
  catch(e){}
}

const parseCookies = function(text){
  try {
    let parsedObj=text.split(';').reduce(accumulate,{}) ;
    return text && parsedObj|| {};
  }catch(e){
    return {};
  }
};

const fileNotFoundAction=function(res){
  res.statusCode = 404;
  res.write('File not found!');
  res.end();
};

const initialize = function(){
  this._handlers = {GET:{},POST:{}};
  this._preprocess = [];
  this._postprocess= [];
};

const get = function(url,handler){
  console.log("Entering",url);
  this._handlers.GET[url] = handler;
};

const post = function(url,handler){
  this._handlers.POST[url] = handler;
};

const use = function(handler){
  this._preprocess.push(handler);
};

const postprocess=function(handler){
  this._postprocess.push(handler);
};

const main = function(req,res){
  // console.log(req.headers);
  res.redirect = redirect.bind(res);
  req.urlIsOneOf = urlIsOneOf.bind(req);
  req.cookies = parseCookies(req.headers.cookie||'');
  let content="";
  req.on('data',data=>content+=data.toString())
  req.on('end',()=>{
    req.body = parseBody(content);
    content="";
    debugger;

    this._preprocess.forEach(middleware=>{
      if(res.finished) return;
      middleware(req,res);
    });

    this._postprocess.forEach(finalware=>{
      if(res.finished) return;
      finalware(req,res);
    });

    if(res.finished) return;
    invoke.call(this,req,res);

  });
};

let create = ()=>{
  let rh = (req,res)=>{
    main.call(rh,req,res)
  };
  initialize.call(rh);
  rh.get = get;
  rh.post = post;
  rh.use = use;
  rh.postprocess=postprocess;
  return rh;
}
exports.create = create;

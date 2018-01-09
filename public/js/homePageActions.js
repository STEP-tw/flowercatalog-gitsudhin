const clickOnGifAction=function(){
  let gif=document.getElementById('gif');
  gif.onclick=function(event){
    gif.style.display = "none";
    setTimeout(function(){gif.style.display="block"},1000);
  }
}
window.onload=clickOnGifAction;

//MicroAppGpt 
//By Changwang ZHANG

const pagExeUtil = {
    /**
   * Calculate similarity between two strings
   * @param {string} str1 First string to match
   * @param {string} str2 Second string to match
   * @param {number} [substringLength=2] Optional. Length of substring to be used in calculating similarity. Default 2.
   * @param {boolean} [caseSensitive=false] Optional. Whether you want to consider case in string matching. Default false;
   * @returns Number between 0 and 1, with 0 being a low match score.
   */
  stringSimilarity: function (str1, str2, substringLength=2, caseSensitive=false) {
    if (!caseSensitive) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
    }
    if (str1.length < substringLength || str2.length < substringLength)
        return 0;
    var map = new Map();
    for (var i = 0; i < str1.length - (substringLength - 1); i++) {
        var substr1 = str1.substr(i, substringLength);
        map.set(substr1, map.has(substr1) ? map.get(substr1) + 1 : 1);
    }
    var match = 0;
    for (var j = 0; j < str2.length - (substringLength - 1); j++) {
        var substr2 = str2.substr(j, substringLength);
        var count = map.has(substr2) ? map.get(substr2) : 0;
        if (count > 0) {
            map.set(substr2, count - 1);
            match++;
        }
    }
    return (match * 2) / (str1.length + str2.length - ((substringLength - 1) * 2));
  }
};

const pagExe = {
  doGptChatCompletion: async function(messages, openaiApiProxy, openaiApiKey, openaiGptModel) {
    let rtn = {
      error: null,
      result: null
    };
    let fetchUrl = openaiApiProxy+"v1/chat/completions";
    try {
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + openaiApiKey
        },
        body: JSON.stringify({
          "model": openaiGptModel,
          "messages": messages,
          "temperature": 0
        })
      });

      if (!response.ok) {
        console.error("HTTP ERROR: " + response.status + "\n" + response.statusText);
        let rtext = await response.text();
        console.log(rtext);
        rtn.error = {title: "Gpt executor error!", message: rtext};
      } else {
        rtn.result = await response.json();
        //console.log(rtn);
      }
    } catch(err) {
      console.log("doGptChatCompletion Error!");
      console.error(err);
      rtn.error = {title: "Gpt executor error!", message: err.message};
    }
    return rtn;
  },
  doDalleImageGen: async function(messages, openaiApiProxy, openaiApiKey) {
    let rtn = {
      error: null,
      result: null
    };
    let fetchUrl = openaiApiProxy+"v1/images/generations";
    try {
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + openaiApiKey
        },
        body: JSON.stringify(messages)
      });

      if (!response.ok) {
        console.error("HTTP ERROR: " + response.status + "\n" + response.statusText);
        let rtext = await response.text();
        console.log(rtext);
        rtn.error = {title: "Dalle executor error!", message: rtext};
      } else {
        rtn.result = await response.json();
        //console.log(rtn);
      }
    } catch(err) {
      console.log("doDalleImageGen Error!");
      console.error(err);
      rtn.error = {title: "Dalle executor error!", message: err.message};
    }
    return rtn;
  },
  doBingWeb: async function(corsProxy, query, limit=10) {
    let rtn = {
      error: null,
      result: null
    };
    if(query!=null && query.length>0){
      let fetchUrl = encodeURI(corsProxy+"https://www.bing.com/search?q="+query+"&ensearch=1"); //+"&ensearch=1"
      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          console.error("HTTP ERROR: " + response.status + "\n" + response.statusText);
          let rtext = await response.text();
          console.log(rtext);
          rtn.error = {title: "bingWeb executor error!", message: rtext};
        } else {
          //rtn.result = await response.json();
          let rtext = await response.text();
          let parser = new DOMParser();
          let doc = parser.parseFromString(rtext, 'text/html');
          let bResults = doc.querySelector("#b_results");
          //console.log(bResults);
          //console.log(bResults.textContent);
          //rtn.result=b_results.textContent;
          rtn.result=[];
          for (const child of bResults.children) {
            //console.log(child);
            if((child.className.includes('b_algo') || child.className.includes('b_top') )&& rtn.result.length<limit){
              //console.log(child);
              let link = null;
              if(child.className.includes('b_top')){
                link = child.querySelector(".b_algo > h2 > a");
              } else {
                link = child.querySelector("h2 > a");
              }
              //console.log(link);
              if(link!=null){
                let page = {
                  "name": link.textContent,
                  "url": link.href,
                  "snippet": ''
                };
                let snippet = child.querySelector(".b_caption > p, .b_algoSlug, .b_richcard, .lisn_content, .b_paractl, .rwrl, .b_RichCardAnswerV2");
                //console.log(snippet);
                //console.log(snippet.textContent);
                if(snippet!=null){
                  page.snippet=snippet.textContent;
                }
                //console.log(page);
                rtn.result.push(page);
              }
            }
          }
        }
      } catch(err) {
        console.log("BingWebSearch Error!");
        console.error(err);
        rtn.error = {title: "bingWeb executor error!", message: err.message};
      }
    }
    return rtn;
  },
  doBingImage: async function(corsProxy, query, limit=10) {
    let rtn = {
      error: null,
      result: null
    };
    if(query!=null && query.length>0){
      let fetchUrl = encodeURI(corsProxy+"https://www.bing.com/images/search?q="+query+"&ensearch=1"); //+"&ensearch=1"
      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          console.error("HTTP ERROR: " + response.status + "\n" + response.statusText);
          let rtext = await response.text();
          console.log(rtext);
          rtn.error = {title: "BingImageSearch executor error!", message: rtext};
        } else {
          //rtn.result = await response.json();
          let rtext = await response.text();
          let parser = new DOMParser();
          let doc = parser.parseFromString(rtext, 'text/html');
          let bResults = doc.querySelector("#mmComponent_images_1, #mmComponent_images_2");
          //console.log(bResults);
          //console.log(bResults.textContent);
          //rtn.result=b_results.textContent;
          rtn.result=[];
          for (const childi of bResults.children) {
            //console.log(child);
            if(childi!=null && childi.classList.contains('dgControl_list') && rtn.result.length<limit){
              for (const childj of childi.children) {
                //console.log(childj);
                let link = childj.querySelector(".imgpt > a");
                //console.log(link);
                let mLink = link.getAttribute("m");
                let mLinkObj = JSON.parse(mLink);
                //console.log(mLinkObj['murl']);
                let imgUrl = mLinkObj['murl'];
                let imgSizeType= childj.querySelector(".imgpt > .img_info > span").textContent;
                let imgSrc= childj.querySelector(".imgpt > .img_info > .lnkw > a").textContent;
                let imgName=childj.querySelector(".infopt > div > div > ul").textContent;
                //#mmComponent_images_1 > ul:nth-child(1) > li:nth-child(1) > div > div.infopt > div > div > ul
                let image = {
                  "name": imgName,
                  "url": imgUrl,
                  "src": imgSrc,
                  "size": imgSizeType.split(' · ')[0].replaceAll(' ', ''),
                  "type": imgSizeType.split(' · ')[1]
                };
                //console.log(image);
                if(rtn.result.length<limit){
                  rtn.result.push(image);
                }
              }
            }
          }
        }
      } catch(err) {
        console.log("BingImageSearch Error!");
        console.error(err);
        rtn.error = {title: "BingImageSearch executor error!", message: err.message};
      }
    }
    return rtn;
  },
  doWebFetch: async function(corsProxy, url, domQuerySelector=null, textSearcher=null, lenLimit=1000, sizeLimit=3, textSimThreshold=0.7, rtnParentLevel=0) {
    let rtn = {
      error: null,
      result: null
    };
    if(url!=null && url.length>0){
      let fetchUrl = encodeURI(corsProxy+url); 
      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          console.error("HTTP ERROR: " + response.status + "\n" + response.statusText);
          let rtext = await response.text();
          console.log(rtext);
          rtn.error = {title: "WebPageFetch executor error!", message: rtext};
        } else {
          let rtext = await response.text();
          let parser = new DOMParser();
          let doc = parser.parseFromString(rtext, 'text/html');
          let title = doc.querySelector("head > title").textContent;
          let page = {
            "title": title,
            "body": []
          }
          let body = doc.querySelector("body");
          if(body!=null){
            if(domQuerySelector == null && textSearcher == null){
              let bodyText = body.textContent;
              if(bodyText.length>lenLimit){
                bodyText = bodyText.substring(0,lenLimit);
              }
              page.body.push(bodyText);
            } else {
              let bodySelected = [];
              if (domQuerySelector!=null){
                bodySelected = body.querySelectorAll(domQuerySelector);
              } else {
                let _bodySelected = body.querySelectorAll("*");
                for (const element of _bodySelected) {
                  if (element.children.length == 0) {
                    bodySelected.push(element);
                  }
                }
              }

              //console.log(bodySelected);
              let textMatchList = [];
              for (const element of bodySelected) {
                let eleToAdd = element;
                let eSim = -1;

                if(textSearcher!=null && textSearcher.length>0){
                  eleToAdd=null;
                  eSim=0;
                  let eleText =element.textContent;
                  if(eleText!=null && eleText.length>0){
                    eleText = eleText.trim();
                    eSim = pagExeUtil.stringSimilarity(eleText,textSearcher);
                    if(eleText.includes(textSearcher) && eSim<0.7){
                      eSim=0.7;
                    }
                    if (eSim>=textSimThreshold) {
                      eleToAdd=element;
                    }
                  }
                }

                if(eleToAdd!=null){
                  //console.log(eleToAdd);
                  //console.log("rtnParentLevel="+rtnParentLevel);
                  for(var i=0; i<rtnParentLevel; i++){
                    let eleParent = eleToAdd.parentElement;
                    //console.log(eleParent);
                    if(eleParent==null){
                      break;
                    }else{
                      eleToAdd=eleParent;
                    }
                  }
                  //console.log(eleToAdd);
                  let eText = eleToAdd.textContent;
                  if(eText!=null){
                    textMatchList.push({text: eText.trim(), sim: eSim});
                  }
                }
              }

              //console.log(textMatchList);
              if(textSearcher!=null && textSearcher.length>0){
                textMatchList.sort(function(a, b) {
                  return  b.sim - a.sim;
                });
              }

              //console.log(textMatchList);
              const textSet = new Set();
              for(var i=0; i<textMatchList.length && textSet.size<sizeLimit; i++){
                let iText = textMatchList[i].text;
                if(iText.length>lenLimit){
                  iText=iText.substring(0,lenLimit);
                }
                textSet.add(iText);
              }
              page.body = Array.from(textSet);
            }
          }
          
          rtn.result = page;
          //console.log(rtn);
        }
      } catch(err) {
        console.log("WebPageFetch Error!");
        console.error(err);
        rtn.error = {title: "WebPageFetch executor error!", message: err.message};
      }
    }
    return rtn;
  },
  doJavaScript: async function(script) {
    let rtn = {
      error: null,
      result: null
    };
    if(script!=null && script.length>0){
      //console.log(script);
      try {
        const fScript = new Function(script);
        rtn.result = fScript();
      } catch(err) {
        console.log("JavaScript Error!");
        console.error(err);
        rtn.error = {title: "JavaScript executor error!", message: err.message};
      }
    }
    return rtn;
  },
  doLog: async function(prompt) {
    let rtn = {
      error: null,
      result: prompt
    };
    return rtn;
  }
};
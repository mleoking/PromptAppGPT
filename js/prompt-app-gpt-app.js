//MicroAppGpt 
//By Changwang ZHANG

const { createApp } = Vue;
// const router = VueRouter.createRouter({
//     // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
//     history: VueRouter.createWebHashHistory(),
//     routes: [], // short for `routes: routes`
// });

const appUtil = {
  strCodeEncode: function (str) {
    let rtn = str;
    if(rtn!=null){
      rtn = rtn.replaceAll("\{","\[");
      rtn = rtn.replaceAll("\}","\]");
    }
    return rtn;
  },
  //avoid special replacement patterns in the replace function to avoid $$ in the replacement to be replaced as $.
  //see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
  /*
  Specifying a function as a parameter
  You can specify a function as the second parameter. In this case, the function will be invoked after the match has been performed. The function's result (return value) will be used as the replacement string. (Note: the above-mentioned special replacement patterns do not apply in this case.) Note that the function will be invoked multiple times for each full match to be replaced if the regular expression in the first parameter is global.
  */
  strReplace: function (str, pattern, replacement) {
    let rtn = str;
    if(rtn!=null){
      rtn = rtn.replace(pattern,function() {return replacement});
    }
    return rtn;
  }
};


const app = createApp({
    // Properties returned from data() become reactive state
    // and will be exposed on `this`.
    data() {
      return {
        language: "en-us",
        theUiText: uiText["en-us"],
        openaiApiKey: '',
        openaiApiProxy: '',
        openaiGptModel: '',
        corsProxy:'',
        enableAppEdit: true,
        appCodeSelected: '',
        appOptions: [],
        appCode: '',
        appName: '',
        appObj: null,
        appUserInputs: [],
        //appUserInputs: ['uin1','uin2'],
        appTaskOutputs: [],
        //appTaskOutputs: ['what pizza would you like?','what toppings would you like?','Do you have anything else to order?'],
        //appTaskOutputs: ['out1','run_dalle%a white cat%'],
        appCurrentSysTask: null,
        appCurrentUserTask: null,
        appUiInputs: [],
        appValues:{},
        editor: null,
        alert: null
        //appUiInputs: [{code: '${Topping1@select=extra cheese/mushrooms}', label: 'Topping1', type: 'select', options:['extra cheese','mushrooms'], value: ''}, {code: '${Chat@textarea=chat}', label: 'Chat', type: 'textarea', options:[], value: ''}]
        //appTaskOutputs: ['hello','leoking','You are OrderBot, an automated service to collect orders for a pizza restaurant. ','You are OrderBot, an automated service to collect orders for a pizza restaurant.   You first greet the customer, then collects the order,   and then asks if its a pickup or delivery.   You wait to collect the entire order, then summarize it and check for a final   time if the customer wants to add anything else.   If its a delivery, you ask for an address. ']
      }
    },

    // Methods are functions that mutate state and trigger updates.
    // They can be bound as event listeners in templates.
    methods: {
      async loadConfig() {
        try {
          const response = await fetch('./config.yml');
          if (!response.ok) {
            console.error("loadConfig response not ok: " + response.status + "\n" + response.statusText);
          } else {
            const text = await response.text();
            let tObj = jsyaml.load(text);
            //console.log(tObj);
            this.openaiApiKey=tObj.openaiApiKey;
            this.openaiApiProxy=tObj.openaiApiProxy;
            this.openaiGptModel=tObj.openaiGptModel;
            this.corsProxy=tObj.corsProxy;
            this.enableAppEdit=tObj.enableAppEdit;
            this.appOptions=tObj.appOptions;
            this.appCodeSelected=tObj.appOptions[0].code;
            //console.log(this.appOptions);
            //console.log(this.appCodeSelected);
            this.loadAppFile(this.appCodeSelected);
          }
        } catch(err) {
          console.error(err);
          console.log("loadConfig Error!");
          this.uiShowWebSecurity();
        }
      },
      uiShowWebSecurity(){
        location.href = "#websecurity";
      },
      onAppCodeSelectedChange(){
        this.loadAppFile(this.appCodeSelected);
      },
      loadAppFile(appFile) {
        fetch('./app/'+appFile)
         .then((response) => response.text())
         .then((code) => this.loadAppCode(code))
         .then((code)=>{
          //this.loadCodeMirror();
          this.editor.setValue(code);
         });
      },
      loadAppCode(code) {
        let tObj = jsyaml.load(code);
        //console.log(tObj);
        this.appCode=code;
        this.appName=tObj.name;
        this.appObj=tObj;
        this.appUserInputs=[];
        this.appTaskOutputs=[];
        this.appCurrentSysTask=null;
        this.appCurrentUserTask=null;
        this.appUiInputs=[];
        this.appValues={};
        this.prepCurrentTask(tObj);
        return this.appCode;
      },
      uiAppAuthor() {
        let rtn = '';
        if (this.appObj !== null && this.appObj.author !== null) {
            rtn = this.appObj.author;
        }
        return rtn;
      },
      uiAppDescription() {
          let rtn = '';
          if (this.appObj !== null && this.appObj.description !== null) {
              rtn = this.appObj.description;
          }
          return rtn;
      },
      prepExtractPrompt(lastOutput,prompt){
        let rtn = prompt;
        if (lastOutput!=null && rtn!=null && rtn.length>0) {
          //process extraction
          const reExtract = /\$e\{(?:(?!\}e\$)[\s\S])+\}e\$/gm; // (?:(?!ab)[\s\S])+ match a string including newline which does not contain the multi-character sequence ab 
          const reExtract2 = /\$e\{[^\{\}]+\}/gm;
          let extractCodes = rtn.match(reExtract);
          if(extractCodes==null){
            extractCodes = rtn.match(reExtract2);
          }
          //console.log(extractCodes);
          if(extractCodes!=null){
            for (let i=0; i<extractCodes.length; i++) {
              let iRightBracket = extractCodes[i].lastIndexOf("}");
              let extractCode = extractCodes[i].substring(3, iRightBracket);
              //console.log(extractCode);
              let extracted = null;
              if(extractCode==="RawInput"){
                extracted = [lastOutput];
              } else {
                const reExtractCode = new RegExp(extractCode, 'im');
                extracted = lastOutput.match(reExtractCode);
              }
              
              //console.log("extracted:\n"+extracted);
              if(extracted != null){
                if (extractCode.includes("(")){
                  if(extracted.length>1){
                    rtn = appUtil.strReplace(rtn,extractCodes[i],extracted[1]);
                  }
                } else if (extracted.length>0) {
                  rtn = appUtil.strReplace(rtn,extractCodes[i],extracted[0]);
                }
                //console.log("rtn:\n"+rtn);
              }
            }
          }
        }
        return rtn;
      },
      prepValuePrompt(values,prompt){
        let rtn = prompt;
        if (values!=null && rtn!=null && rtn.length>0) {
          const reValue = /\$v\{(?:(?!\}v\$)[\s\S])+\}v\$/gm; // (?:(?!ab)[\s\S])+ match a string including newline which does not contain the multi-character sequence ab 
          const reValue2 = /\$v\{[^\{\}]+\}/gm;
          let valueCodes = rtn.match(reValue);
          if(valueCodes==null){
            valueCodes = rtn.match(reValue2);
          }
          //console.log(values);
          //console.log(valueCodes);
          if(valueCodes!=null){
            for (let i=0; i<valueCodes.length; i++) {
              let iRightBracket = valueCodes[i].lastIndexOf("}");
              let valueCode = valueCodes[i].substring(3, iRightBracket);
              //console.log(valueCode);
              let iEqual = valueCode.indexOf("=");
              let value = '';
              if(iEqual>=0){
                let vName = valueCode.substring(0, iEqual);
                let vValue = valueCode.substring(iEqual+1);
                values[vName]=vValue;
              } else {
                value = values[valueCode];
              }
              
              //console.log(value);
              rtn = appUtil.strReplace(rtn,valueCodes[i],value);
            }
          }
          //console.log(values);
          //console.log(rtn);
        }
        return rtn;
      },
      prepTriggerTask(lastOutput,tasks) {
        let rtn = null;
        if (lastOutput!=null && tasks!=null && tasks.length>0){          
          for(let i = 0; i < tasks.length; i++){
            let ti = tasks[i];
            let tiTrigger = '';
            if (ti.hasOwnProperty('trigger')){
              tiTrigger = ti.trigger;
            }
            //console.log(lastOutput+"|"+upiTrigger);
            const tiTriggerRe = new RegExp(tiTrigger, 'i');
            if (tiTriggerRe.test(lastOutput)) {
              rtn = Object.assign({}, ti); // Shallow copy the task so as not to modify the prompt of ti when doing prepExtractPrompt;
              break;
            }
          }

          if(rtn!=null && rtn.prompt!=null){
            rtn.prompt=this.prepExtractPrompt(lastOutput,rtn.prompt);
            rtn.prompt=this.prepValuePrompt(this.appValues,rtn.prompt);
          }
        }
        return rtn;
      },
      prepUiInputs() {
        this.appUiInputs=[];
        if (this.appCurrentUserTask!=null) {
            let prompt = this.appCurrentUserTask.prompt;
            if (prompt.length>0) {
                //process input
                // (?:     # begin non-capturing group
                //   (?!   # begin negative lookahead
                //     ab  # literal text sequence ab
                //   )     # end negative lookahead
                //   .     # any single character
                // )       # end non-capturing group
                // +       # repeat previous match one or more times
                // (?:(?!ab).)+ match a string which does not contain the multi-character sequence ab
                const reInput = /\$i\{(?:(?!\}i\$)[\s\S])+\}i\$/gm; // (?:(?!ab)[\s\S])+ match a string including newline which does not contain the multi-character sequence ab
                const reInput2 = /\$i\{[^\{\}]+\}/gm;
                let inputCodes = prompt.match(reInput);
                if(inputCodes==null){
                  inputCodes = prompt.match(reInput2);
                }
                //console.log(inputCodes);
                if (inputCodes!=null){
                  for (let i=0; i<inputCodes.length; i++) {
                    let uiInputObj = {code:'', label:'', type:'', options:[], value: ''}
                    let iRightBracket = inputCodes[i].lastIndexOf("}");
                    let inputCode = inputCodes[i].substring(3, iRightBracket);
                    uiInputObj.code = inputCodes[i];

                    let iAt = inputCode.indexOf("@");
                    let iHash = inputCode.indexOf("#");
                    let iEqual = inputCode.indexOf("=");

                    uiInputObj.label = inputCode.substring(0,iAt);
                    if(iHash>=0){ //select type
                      uiInputObj.type = inputCode.substring(iAt+1,iHash);
                      let options = inputCode.substring(iHash+1);
                      if(iEqual>=0){
                        options = inputCode.substring(iHash+1,iEqual);
                      }
                      uiInputObj.options = options.split("/");
                    } else {
                      uiInputObj.type = inputCode.substring(iAt+1);
                      if(iEqual>=0){
                        uiInputObj.type = inputCode.substring(iAt+1,iEqual);
                      }
                    }

                    if(iEqual>=0){
                      uiInputObj.value = inputCode.substring(iEqual+1);
                    }

                    /*
                    let inputCodeA = inputCode.split("@");
                    uiInputObj.label = inputCodeA[0];

                    let inputCodeAB = inputCodeA[1].split("=");
                    uiInputObj.type = inputCodeAB[0];

                    if(uiInputObj.type == 'select') {
                        uiInputObj.options =  inputCodeAB[1].split("/");
                    } else {
                      if(inputCodeAB.length>1){
                        uiInputObj.value = inputCodeAB[1];
                      }
                    }
                    */

                    this.appUiInputs.push(uiInputObj);
                  }
                }         
            }
        }
      },
      prepCurrentTask(appObj) {
        if (appObj!=null) {
          let lastTaskOutput = '';
          if (this.appTaskOutputs.length>0) {
              lastTaskOutput = this.appTaskOutputs[this.appTaskOutputs.length-1];
          }
          this.appCurrentSysTask = this.prepTriggerTask(lastTaskOutput,appObj.sysTask);
          this.appCurrentUserTask = this.prepTriggerTask(lastTaskOutput,appObj.userTask);
          //console.log(this.appCurrentSysTask);
          //console.log(this.appCurrentUserTask);
          this.prepUiInputs();
        }
      },
      async appRunPrompt(cPrompt) {
        let rtn = null;
        if(cPrompt!=null && cPrompt.length>0){
          let cuTask = this.appCurrentUserTask;
          let csTask = this.appCurrentSysTask;
          let appObj = this.appObj;
          let appTaskOutputs = this.appTaskOutputs;
          let appUserInputs = this.appUserInputs;

          let messages = null;
          let response = null;
          let output = null;
          //console.log(cPrompt);
          switch(cuTask.executor) {
            case "gpt":
              messages = [];
              if(csTask!=null && csTask.executor == "gpt"){
                if(csTask.prompt!=null && csTask.prompt.length > 0){
                  messages.push({
                    role: "system",
                    content: csTask.prompt
                  });
                }
              }

              if (appUserInputs.length>0 && appObj.gptRound=="multiple") {
                for (let i=0; i<appUserInputs.length; i++) {
                  messages.push({
                    role: "user",
                    content: appUserInputs[i]
                  });
                  messages.push({
                    role: "assistant",
                    content: appTaskOutputs[i]
                  });
                }
              }

              messages.push({
                role: "user",
                content: cPrompt
              });

              //console.log(messages);
              response = await pagExe.doGptChatCompletion(messages, this.openaiApiProxy, this.openaiApiKey, this.openaiGptModel);
             /*
              response={
                'id': 'chatcmpl-6p9XYPYSTTRi0xEviKjjilqrWU2Ve',
                'object': 'chat.completion',
                'created': 1677649420,
                'model': 'gpt-3.5-turbo',
                'usage': {'prompt_tokens': 56, 'completion_tokens': 31, 'total_tokens': 87},
                'choices': [
                  {
                    'message': {
                      'role': 'assistant',
                      'content': 'a cute cat'},
                    'finish_reason': 'stop',
                    'index': 0
                  }
                ]
              }
              */
              //response=null;
              //console.log(response);

              if (response.result != null) {
                if(response.result.choices!=null && response.result.choices.length>0){
                  output = response.result.choices[0].message.content;
                }
              }
              
              break;
            case "dalle":
              //cps = cPrompt.split("\n");
              let dalleVars = jsyaml.load(cPrompt);
              //console.log(dalleVars);
              messages = {
                "prompt": dalleVars.prompt,
                "n": dalleVars.n,
                "size": dalleVars.size
              };

              //console.log(messages);
              response = await pagExe.doDalleImageGen(messages, this.openaiApiProxy, this.openaiApiKey);
              /*
              response = {
                created: 1684663985,
                data: [
                  {
                    url: "https://codemirror.net/5/doc/logo.png"
                  },
                  {
                    url: "https://static.toiimg.com/thumb/msid-84131737,imgsize-19106,width-400,resizemode-4/84131737.jpg"
                  }
                ]
              };
              */
              //response=null;
              //console.log(response);
              
              if (response.result != null) {
                if(response.result.data!=null && response.result.data.length>0){
                  output = '';
                  for (let i=0; i<response.result.data.length; i++) {
                    output = output+"$o{image"+(i+1)+"@img="+response.result.data[i].url+"}o$";
                  }
                }
              }
              break;
            case "bingWeb":
              let bingWebVars = jsyaml.load(cPrompt);
              //console.log(bingWebVars);
              response = await pagExe.doBingWeb(this.corsProxy, bingWebVars.query, bingWebVars.limit);
              //console.log(response);
              if (response.result != null && response.result.length>0) {
                output = '';
                for (let i=0; i<response.result.length; i++) {
                  let iName = response.result[i].name; //appUtil.strCodeEncode(
                  let iUrl = response.result[i].url;
                  let iSnippet = response.result[i].snippet; //appUtil.strCodeEncode(
                  output = output+"$o{"+iName+"@a="+iUrl+"}o$";
                  output = output+"$o{"+iName+"@span="+iSnippet+"}o$\n";
                }
              }
              //console.log(output);
              break;
            case "bingImage":
              let bingImageVars = jsyaml.load(cPrompt);
              //console.log(bingImageVars);
              response = await pagExe.doBingImage(this.corsProxy, bingImageVars.query,bingImageVars.limit);
              if (response.result != null && response.result.length>0) {
                output = '';
                for (let i=0; i<response.result.length; i++) {
                  let iNameUrl = response.result[i].name+"@img="+response.result[i].url; //appUtil.strCodeEncode(
                  let iNameDesc = response.result[i].name+"@span=name:"+response.result[i].name+";src:"+response.result[i].src+";size:"+response.result[i].size+";type:"+response.result[i].type; //appUtil.strCodeEncode(
                  output = output+"$o{"+iNameUrl+"}o$";
                  output = output+"$o{"+iNameDesc+"}o$\n";
                }
              }
              break;
            case "webFetch":
              let webFetchVars = jsyaml.load(cPrompt);
              //console.log(webFetchVars);
              response = await pagExe.doWebFetch(this.corsProxy, webFetchVars.url, webFetchVars.domQuerySelector, webFetchVars.textSearcher, webFetchVars.lenLimit, webFetchVars.sizeLimit, webFetchVars.textSimThreshold, webFetchVars.rtnParentLevel);
              //console.log(response);
              if (response.result != null) {
                output = "";
                if(response.result.title!=null){
                  output = output+"$o{"+response.result.title+"@a="+webFetchVars.url+"}o$";
                }
                if(response.result.body!=null && response.result.body.length>0){
                  for (let i=0; i<response.result.body.length; i++) {
                    let bodyi = response.result.body[i]; //appUtil.strCodeEncode(
                    output = output+"$o{body"+(i+1)+"@span="+bodyi+"}o$";
                  }
                }
              }
              //console.log(output);
              break;
            case "javaScript":
              //console.log(cPrompt);
              response = await pagExe.doJavaScript(cPrompt);
              if (response.result != null) {
                output = response.result;
              }
              //console.log(response);
              break;
            case "log":
              response = await pagExe.doLog(cPrompt);
              //console.log(response);
              if (response.result != null) {
                output = response.result;
              }
              break;
            default:
              console.log("Unknown executor: " + cuTask.executor);
          }

          rtn = output;
          if(output!=null && cuTask.hasOwnProperty('outputer')){
            let outputer = cuTask.outputer;
            rtn = this.prepExtractPrompt(output,outputer);
            rtn = this.prepValuePrompt(this.appValues,rtn);
          }
          if(response.error!=null){
            this.popAlert(response.error.title, response.error.message);
          }
        }
        
        return rtn;
      },
      popAlert(title,content) {
        if(this.alert==null){
           this.alert={
             title: title,
             content: content
           };
        } else {
            this.alert.title = this.alert.title+";"+title;
            this.alert.content = this.alert.content+";"+content;
        }
        
        //alert(title+"\n\n"+content);
      },
      closeAlert(){
        this.alert=null;
      },
      async appRun() {
        //console.log(this.appUiInputs);
        //console.log(this.appCurrentUserTask);
        //console.log(this.appObj);
        let cuTask = this.appCurrentUserTask;
        let appUiInputs = this.appUiInputs;
        let appValues = this.appValues;

        if(cuTask!=null){
          let cPrompt = cuTask.prompt;
          for (let i=0; i<appUiInputs.length; i++) {
            cPrompt=appUtil.strReplace(cPrompt,appUiInputs[i].code,appUiInputs[i].value);
            appValues[appUiInputs[i].label]=appUiInputs[i].value;
          }

          //console.log(appValues);
          //console.log(cPrompt);
          //console.log(cuTask);

          let output = await this.appRunPrompt(cPrompt);
          if(cuTask.hasOwnProperty('validator')){
            let validator = cuTask.validator;
            const validatorRe = new RegExp(validator, 'i');
            let i = 0;
            //console.log("output="+output);
            while((!validatorRe.test(output)) && i<this.appObj.failedRetries){
              console.log("FailedRetry: "+cPrompt);
              //console.log(cuTask);
              output = await this.appRunPrompt(cPrompt);
              i = i+1;
            }
            if(!validatorRe.test(output)){
              console.error("Invalid task output: "+output);
              console.log(cuTask);
              this.popAlert("Invalid task output!", "Executor: "+cuTask.executor+" | Prompt: "+cPrompt+" | Validator: "+validator+" | Output: "+output);
              return;
            }
          }

          if(output!=null) {
            this.appTaskOutputs.push(output);
            this.appUserInputs.push(cPrompt);
            //console.log(this.appTaskOutputs);
            //console.log(this.appUserInputs);

            this.prepCurrentTask(this.appObj);
            //console.log(this.appObj);
            if(this.appUiInputs.length==0){
              if(this.appObj.hasOwnProperty('autoRun') && this.appObj.autoRun){
                this.appRun();
              }
            }
          } else {
            this.popAlert("Task output is null!", "Executor: "+cuTask.executor+" | Prompt: "+cPrompt);
          }
        }
      },
      appReset(){
        this.loadAppCode(this.appCode);
      },
      uiOutput(){
        let rtn = [];
        let appTaskOutputs = this.appTaskOutputs;
        for (let i=0; i<appTaskOutputs.length; i++) {
          let outputI = appTaskOutputs[i]+"";
          let uiOutputObjList = {code:'', label:'', type:'list', options:[], value: ''}

          const reOutput = /\$o\{(?:(?!\}o\$)[\s\S])+\}o\$/gm; // (?:(?!ab)[\s\S])+ match a string including newline which does not contain the multi-character sequence ab
          const reOutput2 = /\$o\{[^\{\}]+\}/gm;
          //console.log(outputI);
          let outputCodes = outputI.match(reOutput);
          if(outputCodes==null){
            outputCodes = outputI.match(reOutput2);
          }
          //console.log(outputCodes);
          if (outputCodes!=null){
            for (let j=0; j<outputCodes.length; j++) {
              let uiOutputObj = {code:'', label:'', type:'', options:[], value: ''}
              let iRightBracket = outputCodes[j].lastIndexOf("}");
              let outputCode = outputCodes[j].substring(3, iRightBracket);
              //console.log(outputCode);
              uiOutputObj.code = outputCodes[j];
              let iAt = outputCode.indexOf("@");
              let iEqual = outputCode.indexOf("=");
              uiOutputObj.label = outputCode.substring(0,iAt);
              uiOutputObj.type = outputCode.substring(iAt+1,iEqual);
              uiOutputObj.value = outputCode.substring(iEqual+1);
              uiOutputObjList.options.push(uiOutputObj);
              outputI = appUtil.strReplace(outputI,uiOutputObj.code,'');
            }
          }
          if(outputI.length>0){
            let uiOutputObj = {code:'', label:'', type:'span', options:[], value: outputI}
            uiOutputObjList.options.push(uiOutputObj);
          }

          rtn.push(uiOutputObjList);
        }
        //console.log(rtn);
        return rtn;
      },
      changUiMode() {
        halfmoon.toggleDarkMode();
      },
      changUiText(){
        if(this.language == "zh-cn"){
          this.language = "en-us";
          this.theUiText = uiText["en-us"];
        } else {
          this.language = "zh-cn";
          this.theUiText = uiText["zh-cn"];
        }
      },
      changEditMode() {
        this.enableAppEdit = ! this.enableAppEdit;
      },
      loadCodeMirror() {
        this.editor = Vue.markRaw(CodeMirror.fromTextArea(document.getElementById("app-code"), {
          lineNumbers: true,styleActiveLine: true, matchBrackets: true, theme: "blackboard"
        }));
      },
      compile() {
        this.appCode=this.editor.getValue();
        //console.log(this.appCode);
        this.loadAppCode(this.appCode);
      },
      async doTest() {
        //let response = await pagExe.doBingImageSearch("大熊猫");
        //let response = await pagExe.doBingWebSearch("大熊猫");
        //let response = await pagExe.doWebPageFetch("https://developer.mozilla.org/en-US/docs/Web/API/element/querySelector");
        //let response = await pagExe.doWebPageFetch("https://developer.mozilla.org/en-US/docs/Web/API/element/querySelector", ".code-example");
        let response = await pagExe.doJavaScript("let a=1+1;let b=a*2;let next='step1';if(b>2){next='step2'};return 'next step is:'+next;");
        //let response = await pagExe.doJavaScript("let a=1+1xleo");
        console.log(response);
      }
    },

    // Lifecycle hooks are called at different stages
    // of a component's lifecycle.
    // This function will be called when the component is mounted.
    mounted() {
      let language = navigator.language;
      if(language.toLowerCase()=="zh-cn"){
        this.language = "zh-cn";
        this.theUiText = uiText["zh-cn"];
      }
      console.log(`PromptAppGpt App Start! Language:`+language); //${this.appCodeSelected}
      halfmoon.toggleDarkMode();
      this.loadConfig();
      this.loadCodeMirror();
      //router.push('websecurity');
      //this.popAlert("Invalid task output", "validator: "+"abc"+" | output: "+"cde");
    }
  })

//app.use(router);
app.mount('#main_app');




//MicroAppGpt 
//By Changwang ZHANG

const { createApp } = Vue;
// const router = VueRouter.createRouter({
//     // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
//     history: VueRouter.createWebHashHistory(),
//     routes: [], // short for `routes: routes`
// });


const app = createApp({
    // Properties returned from data() become reactive state
    // and will be exposed on `this`.
    data() {
      return {
        language: "en-us",
        theUiText: uiText["en-us"],
      }
    },

    // Methods are functions that mutate state and trigger updates.
    // They can be bound as event listeners in templates.
    methods: {
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
      console.log(`PromptAppGpt Home Start! Language:`+language); //${this.appCodeSelected}
      halfmoon.toggleDarkMode();
    }
  })

//app.use(router);
app.mount('#main_app')




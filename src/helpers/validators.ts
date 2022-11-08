export default  class Validators {

    async rangeValidator(value,params) {
       var minParam = params.find(x=>x.name === 'min');
       var maxParam = params.find(x=>x.name === 'min');
       if (minParam && minParam.value && maxParam && maxParam.value){
            if (value > parseInt(minParam.value) &&value< parseInt(maxParam.value)){
                return {
                    success: true
                }
            }
            else {
                return {
                    error: `${value} should be less than ${maxParam.value} and greater than ${minParam.value}`
                }
            }
       }
       else {
        return {
            success: true
        }
       }
    }; 
    
    async containedInDefinedList(value,params) {
        var values = params.find(x=>x.name === 'value');
        if (values && values.value){           
             if ( values.value.split(',').indexOf(String(value)) === -1){
                return {
                    error: `${value} should be within the given value set ${values.value}`
                }
             }
             else {
                return {
                    success: true
                }
             }
        }
        else {
         return {
             success: true
         }
        }
     }; 
}


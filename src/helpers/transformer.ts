export default  class Transformers {

    async convertToBool(value) {
       if (value === 0){
        return false;
       }
       else if (value === 1){
        return true
       }       
    }; 

    async formatDateTime(date)
    {
        if (date === "0000-00-00 00:00:00") {
            return null;
        }
        return date;
    };

    async invert(value)
    {        
        return !!value;
    };
}


export default  class Transformers {

    async convertToBool(value) {
       if (value === 0){
        return false;
       }
       else if (value === 1){
        return true
       }       
    }; 

           
    async getNetworkType(value) {
        if (!value){
            return 'undefined';
        }
        switch(value){
            case '0':
            case 0:
                return 'individual';
            case '1':
            case 1:
                return 'team';
            case '2':
            case 2:
                return 'team_member';
            case '3':
            case 3:
                return 'supernetwork_member';
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


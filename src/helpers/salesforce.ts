var jsforce = require('jsforce');
var moment = require("moment-timezone");
export default  class salesforceHelper {
    authConfig = null;
    connection = new jsforce.Connection();
    tokenValid = false;
    status = null;
    async storeAuthConfig(config) {
        this.authConfig = config;
    }

    async initialise(username,password, securityToken,loginUri) {
        if (! this.authConfig || ! this.authConfig.accessToken || ! this.authConfig.instanceUrl)
        {
            await this.storeAuthConfig({accessToken: '', instanceUrl: ''});
        }
        // Set up our SF connection (although it won't have connected/authenticated yet)
        this.connection = new jsforce.Connection({
            accessToken:  this.authConfig.accessToken,
            instanceUrl:  this.authConfig.instanceUrl
        });
    
        // Now move on and check that we can access Salesforce
        await this.checkSalesforceAuthenticated(username,password, securityToken,loginUri);
    };



    async checkSalesforceAuthenticated(username,password, securityToken,loginUri) 
    {
        if (!this.authConfig.accessToken || !this.authConfig.instanceUrl) {
            console.log("[Auth] No accessToken found, need to do OAuth2 auth");
            await this.authenticateSalesforce(username,password, securityToken,loginUri);
        } else {
            // Attempt to load a Contact from SF. If we get a valid response (even no results), our Authentication is cool.
            console.log("[Auth] Doing test Member load from SF to check auth");
            try{
                const contact = await this.connection.sobject("Contact").find({movember_member_id__c: "103"}, {AccountId: 1})
                if (contact){
                    this.tokenValid = true;
                    console.log("connected");
                }
                else {
                    throw new Error("Connection failed");
                }
            }
            catch(err){
                this.tokenValid = false;

                if (err.errorCode === "INVALID_SESSION_ID") {
                    console.log("[Auth] Attempting re-authentication");
                    await this.authenticateSalesforce(username,password, securityToken,loginUri);
                        
                } else {
                    throw err;
                }
            }
        }
    };

    isTokenValid() {
        return this.tokenValid;
    };

    logout() {
        if (this.hasConnection()) {
            console.log("Sending disconnect.");
            this.getConnection().logout(function (err) {
                if (err) {
                    console.log("Error shutting down SF: ", err);
                    return console.error(err);
                }
                // now the session has been expired.
                console.log("SF Connection disconnected.");
            });
        } else {
            console.log("No SF connection to disconnect");
        }
    };

    // Check if a SF Connection has already been set up or not
    hasConnection() {
        return !!this.connection;
    };

    // Return our SF Connection.
    // If no connection has been created yet, set it up and return that instead
    getConnection() {
        return this.connection;
    };

    async authenticateSalesforce (username,password, securityToken,loginUri) {
        if (this.status === "authenticating") {
            console.log("Already started authenticating");
        } else {
            this.status = "authenticating";
            this.connection = new jsforce.Connection({
                loginUrl : loginUri
            });
            console.log("[Auth] Attempting to create new access token via OAuth2");
            try{
                var userInfo = await this.connection.login(username, password + securityToken);
                if (userInfo){
                    // Now you can get the access token and instance URL information.
                    console.log("[Auth] Authentication via OAuth2 succeeded.");
                    console.log("[Auth]  - Access Token: ", this.connection.accessToken.substring(1, 16) + "...");
                    console.log(this.connection.accessToken);
                    console.log("[Auth]  - InstanceURL: ", this.connection.instanceUrl);
                    // logged in user property
                    console.log("[Auth]  - User ID: " + userInfo.id);
                    console.log("[Auth]  - Org ID: " + userInfo.organizationId);

                    // Save them to establish connection next time.
                    await this.storeAuthConfig({accessToken: this.connection.accessToken, instanceUrl: this.connection.instanceUrl});
                    // Mark the connection as valid, so we can start work.
                    this.tokenValid = true;
                    this.status = "authenticated";   
                }
                else {
                    console.log("Authentication failed");
                    throw new Error("Authentication Failed");
                }
            }
            catch(ex)
            {
                console.log("Authentication failed");
                console.log(ex);
                throw ex;
            }
        }
    };

    formatDateTime(date, allowNull)
    {
        if (date === "0000-00-00 00:00:00") {
            if (typeof allowNull !== 'undefined') {
                return null;
            }
            return null;
        }
        return date;
    };

    /**
     * SF-friendly date formatter
     *
     * Currently we're just nulling out any "empty" dates.
     * Later we could format different types of input dates into a consistent SF date, if required
     */
    formatDate (date, allowNull)
    {
        if (date === null) {
            if (typeof allowNull !== 'undefined') {
                return null;
            }
            return null;
        } else {
            return moment.utc(date).format('YYYY-MM-DD');
        }

    };

    async sendData (data,apiEndpoint)
    {
        var response = {err:"",response:""};
        if (data){
            try { 
                await this.connection.apex.put(apiEndpoint, data,
                (err,result)=>{
                    if (err)
                    {
                        response.err = err;
                    } else {
                        response.response =result;
                    }
                });
            }
            catch(ex){
                response.err = ex;
            }
        }
        return response;
    }
}


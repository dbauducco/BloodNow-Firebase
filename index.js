const functions = require('firebase-functions');

 // Create and Deploy Your First Cloud Functions
 // https://firebase.google.com/docs/functions/write-firebase-functions

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

exports.applicationsOnCreate = functions.firestore.document('applications/{applicationID}').onCreate((snap, context) => {

    // Update request count
    db.collection("requests").doc(snap.data().requestID).get().then(snapshot => {
        
        if (snapshot.empty == null) {
        
            var currentCount = snapshot.data().applicationCount;
            if (currentCount == null) { currentCount = 0; }
            
            snapshot.ref.set({ applicationCount: currentCount+1 }, {merge: true});
        }
    });
    
    // Generate random call ID
    var randomCallID = Math.floor(Math.random()*90000) + 10000;
    return snap.ref.set({ callID: randomCallID, dateCreated: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
});

exports.applicationsOnDelete = functions.firestore.document('applications/{applicationID}').onDelete((snap, context) => {
    
    // Update request count
    return db.collection("requests").doc(snap.data().requestID).get().then(snapshot => {
        
        if (snapshot.empty == false) {
            
            var currentCount = snapshot.data().applicationCount;
            snapshot.ref.set({ applicationCount: currentCount-1 }, {merge: true});
            
        } else {
            
            console.log("DELETED REQUEST!!!");
        }
    })
    
});

exports.requestOnDelete = functions.firestore.document('requests/{requestID}').onDelete((snap, context) => {
    
    // Update request count
    return admin.firestore().collection("applications").where('requestID', '==', context.params.requestID).get()
    .then(snapshot => {
        
        if (snapshot.empty) {
            return 0;
        }  

        snapshot.docs.forEach(doc => {
            doc.ref.delete();
        });
    
    })
    
});

exports.requestOnCreate = functions.firestore.document('requests/{requestID}').onCreate((snap, context) => {
    
    db.collection("locations").doc(snap.data().locationID).get().then(snapshot => {
        
        if (snapshot.empty == null) {
            
            var location = snapshot.data().location;
            var locationName = snapshot.data().locationName;
            var locationPicture = snapshot.data().locationPicture;
            return snap.ref.set({ location: location, locationName: locationName, locationPicture: locationPicture, applicationCount: 0, dateCreated: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
            
        } else {
            
            return 200;
        }
    });
    
    
     
});

exports.getPhoneNumber = functions.https.onRequest((req, res) => {
    
    var testCallID = parseInt(req.body.callID);
  
    admin.firestore().collection("applications").where('callID','==',testCallID).get().then(snapshot => {
        if(snapshot.empty) {
            return res.status(200).send("Empty!");
        }
        
        var userID = snapshot.docs[0].data().userID;
            
        
        admin.auth().getUser(userID)
        .then(function(userRecord) {
            
            var data = userRecord.toJSON().phoneNumber + "";
            return res.status(200).send(data);
        })

    });
    
});
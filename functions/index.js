const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.labelIndexing = functions.firestore
    .document("labels/{labelId}")
    .onCreate(async (change, context) => {
        const labelId = context.params.labelId;
        const label = change.data();
        const searchableIndex = createIndex(label.name);
        const indexedLabel = { ...label, searchableIndex };
        return db.collection("labels").doc(labelId).set(indexedLabel, { merge: true });
    });

function createIndex(title) {
    const arr = title.toLowerCase().split("");
    const searchableIndex = {};
    let prevKey = "";

    for (const char of arr) {
        const key = prevKey + char;
        searchableIndex[key] = true;
        prevKey = key;
    }

    return searchableIndex;
}

exports.aggregateDeletedRatings = functions.firestore
    .document("tracks/{trackId}/reviews/{uid}")
    .onDelete(async (change, context) => {
        try {
            const trackRef = db.collection("tracks").doc(context.params.trackId);
            await db.runTransaction(async (transaction) => {
                const trackDoc = await transaction.get(trackRef);
                const oldRatingTotal = trackDoc.data().avgRating * trackDoc.data().numRatings;
                const ratingValue = change.data().rating;
                const newNumRatings = trackDoc.data().numRatings - 1;
                let newAvgRatings = (oldRatingTotal - ratingValue) / newNumRatings;

                if (isNaN(newAvgRatings)) {
                    newAvgRatings = 0;
                }

                transaction.update(trackRef, {
                    avgRating: newAvgRatings,
                    numRatings: newNumRatings
                });
            });
        } catch (e) {
            console.log(e);
        }
    });

exports.aggregateRatings = functions.firestore
    .document("tracks/{trackId}/reviews/{uid}")
    .onWrite(async (change, context) => {
        try {
            const trackRef = db.collection("tracks").doc(context.params.trackId);
            await db.runTransaction(async (transaction) => {
                const trackDoc = await transaction.get(trackRef);
                let newNumRatings = trackDoc.data().numRatings;
                const oldRatingTotal = trackDoc.data().avgRating * trackDoc.data().numRatings;
                const ratingValue = change.after.data().rating;
                
                let newAvgRatings = 0;
                if (!change.before.exists) {
                    newNumRatings = trackDoc.data().numRatings + 1;
                    newAvgRatings = (oldRatingTotal + ratingValue) / newNumRatings;
                } else {
                    newAvgRatings = ((oldRatingTotal - change.before.data().rating) + change.after.data().rating) / newNumRatings;
                }
    
                transaction.update(trackRef, {
                    avgRating: newAvgRatings,
                    numRatings: newNumRatings
                });
            });    
        } catch (e) {
            console.log(e);
        }
    });
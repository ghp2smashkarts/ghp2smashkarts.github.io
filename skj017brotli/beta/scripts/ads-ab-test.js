'use strict';

//AB Test: weighted random provider selection
//Skip if ads are disabled (e.g. Discord builds set providers to Dummy)
if (typeof adProviderWeights !== 'undefined' && displayAdProvider !== AdProviderDummy && videoAdProvider !== AdProviderDummy)
{
    var totalWeight = 0;
    for (var provider in adProviderWeights)
    {
        totalWeight += adProviderWeights[provider];
    }

    if (totalWeight > 0)
    {
        var roll = Math.random() * totalWeight;
        var cumulative = 0;

        for (var provider in adProviderWeights)
        {
            cumulative += adProviderWeights[provider];
            if (roll < cumulative)
            {
                displayAdProvider = provider;
                videoAdProvider = provider;
                abTestSelectedProvider = provider;
                break;
            }
        }

        console.log("[AB Test] Ad provider: " + abTestSelectedProvider + " (roll: " + roll.toFixed(1) + "/" + totalWeight + ", weights: " + JSON.stringify(adProviderWeights) + ")");
    }
}

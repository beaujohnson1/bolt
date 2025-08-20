/**
 * eBay Inventory Management using hendt/ebay-api
 * Handles inventory items, offers, and listing management
 */

const eBayApi = require('ebay-api');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        console.log('📦 [EBAY-INVENTORY] Inventory handler started');
        
        const body = event.body ? JSON.parse(event.body) : {};
        const { action, access_token } = body;

        if (!access_token) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Access token is required'
                })
            };
        }

        // Initialize eBay API
        const ebay = new eBayApi({
            appId: process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID,
            certId: process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID,
            sandbox: false,
            siteId: eBayApi.SiteId.EBAY_US,
            marketplaceId: eBayApi.MarketplaceId.EBAY_US
        });

        // Set the access token
        ebay.OAuth2.setCredentials({ access_token });

        console.log(`🎯 [EBAY-INVENTORY] Action: ${action}`);

        switch (action) {
            case 'create-inventory-item':
                return await createInventoryItem(ebay, body, headers);
            
            case 'update-inventory-item':
                return await updateInventoryItem(ebay, body, headers);
            
            case 'get-inventory-item':
                return await getInventoryItem(ebay, body, headers);
            
            case 'delete-inventory-item':
                return await deleteInventoryItem(ebay, body, headers);
            
            case 'bulk-create-inventory':
                return await bulkCreateInventory(ebay, body, headers);
            
            case 'create-offer':
                return await createOffer(ebay, body, headers);
            
            case 'update-offer':
                return await updateOffer(ebay, body, headers);
            
            case 'publish-offer':
                return await publishOffer(ebay, body, headers);
            
            case 'unpublish-offer':
                return await unpublishOffer(ebay, body, headers);
            
            case 'delete-offer':
                return await deleteOffer(ebay, body, headers);
            
            case 'get-offers':
                return await getOffers(ebay, body, headers);
            
            case 'bulk-publish-offers':
                return await bulkPublishOffers(ebay, body, headers);
            
            case 'get-listing-status':
                return await getListingStatus(ebay, body, headers);
            
            case 'update-quantity':
                return await updateQuantity(ebay, body, headers);
            
            case 'update-price':
                return await updatePrice(ebay, body, headers);
            
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid action',
                        availableActions: [
                            'create-inventory-item', 'update-inventory-item', 'get-inventory-item', 'delete-inventory-item',
                            'bulk-create-inventory', 'create-offer', 'update-offer', 'publish-offer', 'unpublish-offer',
                            'delete-offer', 'get-offers', 'bulk-publish-offers', 'get-listing-status', 
                            'update-quantity', 'update-price'
                        ]
                    })
                };
        }

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Handler error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Inventory operation failed',
                details: error.toString()
            })
        };
    }
};

/**
 * Create inventory item
 */
async function createInventoryItem(ebay, body, headers) {
    try {
        const { sku, inventoryItem } = body;
        
        if (!sku || !inventoryItem) {
            throw new Error('SKU and inventoryItem are required');
        }

        console.log('📦 [EBAY-INVENTORY] Creating inventory item:', sku);

        // Validate and prepare inventory item data
        const itemData = {
            availability: inventoryItem.availability || {
                shipToLocationAvailability: {
                    quantity: 1
                }
            },
            condition: inventoryItem.condition || 'USED_EXCELLENT',
            conditionDescription: inventoryItem.conditionDescription,
            packageWeightAndSize: inventoryItem.packageWeightAndSize,
            product: {
                title: inventoryItem.product?.title || 'Item Title',
                description: inventoryItem.product?.description,
                brand: inventoryItem.product?.brand,
                mpn: inventoryItem.product?.mpn,
                imageUrls: inventoryItem.product?.imageUrls || [],
                aspects: inventoryItem.product?.aspects || {}
            },
            locale: inventoryItem.locale || 'en_US'
        };

        console.log('📋 [EBAY-INVENTORY] Item data prepared:', {
            sku,
            title: itemData.product.title,
            condition: itemData.condition,
            imageCount: itemData.product.imageUrls.length,
            aspectCount: Object.keys(itemData.product.aspects).length
        });

        // Create inventory item using eBay Sell Inventory API
        const response = await ebay.sell.inventory.createOrReplaceInventoryItem(sku, itemData);
        
        console.log('✅ [EBAY-INVENTORY] Inventory item created successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sku: sku,
                message: 'Inventory item created successfully',
                warnings: response?.warnings
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Create inventory error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                errors: error.errors || [{
                    errorId: 'INVENTORY_CREATE_ERROR',
                    domain: 'API_INVENTORY',
                    category: 'REQUEST',
                    message: error.message
                }]
            })
        };
    }
}

/**
 * Update inventory item
 */
async function updateInventoryItem(ebay, body, headers) {
    try {
        const { sku, inventoryItem } = body;
        
        if (!sku || !inventoryItem) {
            throw new Error('SKU and inventoryItem are required');
        }

        console.log('📝 [EBAY-INVENTORY] Updating inventory item:', sku);

        const response = await ebay.sell.inventory.createOrReplaceInventoryItem(sku, inventoryItem);
        
        console.log('✅ [EBAY-INVENTORY] Inventory item updated successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sku: sku,
                message: 'Inventory item updated successfully',
                warnings: response?.warnings
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Update inventory error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Get inventory item
 */
async function getInventoryItem(ebay, body, headers) {
    try {
        const { sku } = body;
        
        if (!sku) {
            throw new Error('SKU is required');
        }

        console.log('📋 [EBAY-INVENTORY] Getting inventory item:', sku);

        const inventoryItem = await ebay.sell.inventory.getInventoryItem(sku);
        
        console.log('✅ [EBAY-INVENTORY] Inventory item retrieved successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sku: sku,
                inventoryItem: inventoryItem,
                message: 'Inventory item retrieved successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Get inventory error:', error);
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Delete inventory item
 */
async function deleteInventoryItem(ebay, body, headers) {
    try {
        const { sku } = body;
        
        if (!sku) {
            throw new Error('SKU is required');
        }

        console.log('🗑️ [EBAY-INVENTORY] Deleting inventory item:', sku);

        await ebay.sell.inventory.deleteInventoryItem(sku);
        
        console.log('✅ [EBAY-INVENTORY] Inventory item deleted successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sku: sku,
                message: 'Inventory item deleted successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Delete inventory error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Bulk create inventory items
 */
async function bulkCreateInventory(ebay, body, headers) {
    try {
        const { inventoryItems } = body;
        
        if (!inventoryItems || !Array.isArray(inventoryItems)) {
            throw new Error('inventoryItems array is required');
        }

        console.log('📦 [EBAY-INVENTORY] Bulk creating inventory items:', inventoryItems.length);

        const results = [];
        const errors = [];

        // Process items sequentially to avoid rate limiting
        for (let i = 0; i < inventoryItems.length; i++) {
            const item = inventoryItems[i];
            
            try {
                await ebay.sell.inventory.createOrReplaceInventoryItem(item.sku, item.data);
                results.push({
                    sku: item.sku,
                    success: true
                });
                console.log(`✅ [EBAY-INVENTORY] Bulk item ${i + 1}/${inventoryItems.length} created: ${item.sku}`);
            } catch (itemError) {
                console.error(`❌ [EBAY-INVENTORY] Bulk item ${i + 1} failed:`, itemError);
                errors.push({
                    sku: item.sku,
                    error: itemError.message
                });
            }
            
            // Add delay to avoid rate limiting
            if (i < inventoryItems.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log('✅ [EBAY-INVENTORY] Bulk create completed:', {
            successful: results.length,
            failed: errors.length
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: results.length > 0,
                results,
                errors,
                summary: {
                    total: inventoryItems.length,
                    successful: results.length,
                    failed: errors.length
                },
                message: `${results.length}/${inventoryItems.length} inventory items created successfully`
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Bulk create error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Create offer
 */
async function createOffer(ebay, body, headers) {
    try {
        const { offer } = body;
        
        if (!offer) {
            throw new Error('Offer data is required');
        }

        console.log('🎯 [EBAY-INVENTORY] Creating offer for SKU:', offer.sku);

        // Validate required offer fields
        if (!offer.sku || !offer.marketplaceId || !offer.price || !offer.categoryId) {
            throw new Error('SKU, marketplaceId, price, and categoryId are required for offer');
        }

        const offerData = {
            sku: offer.sku,
            marketplaceId: offer.marketplaceId,
            format: offer.format || 'FIXED_PRICE',
            price: {
                currency: offer.price.currency || 'USD',
                value: offer.price.value
            },
            quantity: offer.quantity || 1,
            categoryId: offer.categoryId,
            merchantLocationKey: offer.merchantLocationKey,
            listingDescription: offer.listingDescription,
            listingPolicies: offer.listingPolicies,
            tax: offer.tax,
            quantityLimitPerBuyer: offer.quantityLimitPerBuyer,
            storeCategoryNames: offer.storeCategoryNames,
            lotSize: offer.lotSize,
            hideBuyerDetails: offer.hideBuyerDetails
        };

        console.log('📋 [EBAY-INVENTORY] Offer data prepared:', {
            sku: offerData.sku,
            price: offerData.price,
            categoryId: offerData.categoryId,
            quantity: offerData.quantity
        });

        const response = await ebay.sell.inventory.createOffer(offerData);
        
        console.log('✅ [EBAY-INVENTORY] Offer created successfully:', response.offerId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                offerId: response.offerId,
                sku: offer.sku,
                message: 'Offer created successfully',
                warnings: response?.warnings
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Create offer error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                errors: error.errors || [{
                    errorId: 'OFFER_CREATE_ERROR',
                    domain: 'API_SELL',
                    category: 'REQUEST',
                    message: error.message
                }]
            })
        };
    }
}

/**
 * Publish offer to live listing
 */
async function publishOffer(ebay, body, headers) {
    try {
        const { offerId } = body;
        
        if (!offerId) {
            throw new Error('Offer ID is required');
        }

        console.log('🚀 [EBAY-INVENTORY] Publishing offer:', offerId);

        const response = await ebay.sell.inventory.publishOffer(offerId);
        
        console.log('✅ [EBAY-INVENTORY] Offer published successfully:', response.listingId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                offerId: offerId,
                listingId: response.listingId,
                message: 'Offer published successfully',
                warnings: response?.warnings
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Publish offer error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                errors: error.errors || [{
                    errorId: 'PUBLISH_ERROR',
                    domain: 'API_SELL',
                    category: 'REQUEST',
                    message: error.message
                }]
            })
        };
    }
}

/**
 * Unpublish offer
 */
async function unpublishOffer(ebay, body, headers) {
    try {
        const { offerId, reason } = body;
        
        if (!offerId) {
            throw new Error('Offer ID is required');
        }

        console.log('⏸️ [EBAY-INVENTORY] Unpublishing offer:', offerId);

        await ebay.sell.inventory.withdrawOffer(offerId, {
            reason: reason || 'OUT_OF_STOCK'
        });
        
        console.log('✅ [EBAY-INVENTORY] Offer unpublished successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                offerId: offerId,
                message: 'Offer unpublished successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Unpublish offer error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Delete offer
 */
async function deleteOffer(ebay, body, headers) {
    try {
        const { offerId } = body;
        
        if (!offerId) {
            throw new Error('Offer ID is required');
        }

        console.log('🗑️ [EBAY-INVENTORY] Deleting offer:', offerId);

        await ebay.sell.inventory.deleteOffer(offerId);
        
        console.log('✅ [EBAY-INVENTORY] Offer deleted successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                offerId: offerId,
                message: 'Offer deleted successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Delete offer error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Get offers
 */
async function getOffers(ebay, body, headers) {
    try {
        const { sku, marketplaceId, limit, offset } = body;

        console.log('📋 [EBAY-INVENTORY] Getting offers:', { sku, marketplaceId, limit, offset });

        const params = {};
        if (sku) params.sku = sku;
        if (marketplaceId) params.marketplace_id = marketplaceId;
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;

        const response = await ebay.sell.inventory.getOffers(params);
        
        console.log('✅ [EBAY-INVENTORY] Offers retrieved:', response.offers?.length || 0);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                offers: response.offers || [],
                total: response.total || 0,
                message: 'Offers retrieved successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Get offers error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Update offer price
 */
async function updatePrice(ebay, body, headers) {
    try {
        const { offerId, price } = body;
        
        if (!offerId || !price) {
            throw new Error('Offer ID and price are required');
        }

        console.log('💰 [EBAY-INVENTORY] Updating offer price:', { offerId, price });

        const updateData = {
            pricingSummary: {
                price: {
                    currency: price.currency || 'USD',
                    value: price.value
                }
            }
        };

        await ebay.sell.inventory.updateOffer(offerId, updateData);
        
        console.log('✅ [EBAY-INVENTORY] Offer price updated successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                offerId: offerId,
                newPrice: price,
                message: 'Offer price updated successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Update price error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Update quantity
 */
async function updateQuantity(ebay, body, headers) {
    try {
        const { sku, quantity } = body;
        
        if (!sku || quantity === undefined) {
            throw new Error('SKU and quantity are required');
        }

        console.log('📦 [EBAY-INVENTORY] Updating quantity:', { sku, quantity });

        const updateData = {
            availability: {
                shipToLocationAvailability: {
                    quantity: quantity
                }
            }
        };

        await ebay.sell.inventory.createOrReplaceInventoryItem(sku, updateData);
        
        console.log('✅ [EBAY-INVENTORY] Quantity updated successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sku: sku,
                newQuantity: quantity,
                message: 'Quantity updated successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Update quantity error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

/**
 * Get listing status
 */
async function getListingStatus(ebay, body, headers) {
    try {
        const { offerId } = body;
        
        if (!offerId) {
            throw new Error('Offer ID is required');
        }

        console.log('📊 [EBAY-INVENTORY] Getting listing status:', offerId);

        const offer = await ebay.sell.inventory.getOffer(offerId);
        
        console.log('✅ [EBAY-INVENTORY] Listing status retrieved');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                offerId: offerId,
                status: offer.status,
                listingId: offer.listingId,
                marketplaceId: offer.marketplaceId,
                format: offer.format,
                price: offer.pricingSummary?.price,
                quantity: offer.quantity,
                message: 'Listing status retrieved successfully'
            })
        };

    } catch (error) {
        console.error('❌ [EBAY-INVENTORY] Get status error:', error);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}
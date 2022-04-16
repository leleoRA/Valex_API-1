import * as paymentRepository from "../repositories/paymentRepository.js";
import * as cardService from "../services/cardsService.js";
import * as businessService from "../services/businessService.js";
import * as encryptFunctions from "../utils/encryptFunction.js";
import * as errors from "../utils/errorFunctions.js";
import * as cardRepository from './../repositories/cardRepository.js';


export async function insertPayments(
    payment: paymentRepository.PaymentInsertData, 
    password: string,
    cardData: cardRepository.CardDataToOnlinePayment,
) {
    const {
        cardId,
        amount,
        businessId,
    } = payment;

    if (cardData) await validateCardDataOnline(cardData);
    if (amount <= 0) throw errors.badRequestError('"amount" must be greater than zero');
    
    const card = await cardService.findCardById(cardId);
    await cardService.validateIsCardActive(card, false);
    if (card.isBlocked) throw errors.unauthorizedError("card");
    
    if (!cardData) await encryptFunctions.compareEncrypted(password, card.password);
    await validateBusinessType(businessId, card);

    const { balance } = await cardService.getCardOperationsById(cardId);
    if (balance < amount) throw errors.badRequestError("insufficient balance");

    await paymentRepository.insert({ cardId, businessId, amount });
}

async function validateCardDataOnline(
    cardData: cardRepository.CardDataToOnlinePayment,
) {
    const card = await cardService.findByCardDetails(cardData);
    await encryptFunctions.compareEncrypted(cardData.securityCode, card.securityCode);
}

async function validateBusinessType (
    businessId: number, 
    card: cardRepository.Card,
) {

    const business = await businessService.findBusinessById(businessId);
    if (business.type !== card.type) throw errors.unauthorizedError("buy at this establishment");
}
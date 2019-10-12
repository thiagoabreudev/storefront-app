/* eslint-disable no-eval */

import { _config, i18n, formatMoney } from '@ecomplus/utils'
import cardValidator from 'card-validator'
import InputDate from './../_internal/InputDate.vue'
import InputDocNumber from './../_internal/InputDocNumber.vue'
import CleaveInput from 'vue-cleave-component'
import { SlideYUpTransition } from 'vue2-transitions'

import {
  AboutCvv,
  AtSight,
  Birthdate,
  CardNumber,
  ConfirmPurchase,
  DocNumber,
  HolderName,
  InterestFree,
  InvalidCard,
  InvalidCardMsg,
  NameOnCard,
  Of,
  ParcelIn,
  SecurityCode,
  ValidThru
} from './../../lib/i18n'

const countryCode = _config.get('country_code')

export default {
  name: 'EcCreditCard',

  components: {
    InputDate,
    InputDocNumber,
    CleaveInput,
    SlideYUpTransition
  },

  props: {
    mergeDictionary: {
      type: Object,
      default: () => {}
    },
    amount: {
      type: Object,
      required: true
    },
    checkHolder: {
      type: String
    },
    skipHolderInfo: {
      type: Boolean
    },
    isCompany: {
      type: Boolean
    },
    installmentOptions: {
      type: Array
    },
    jsClient: {
      type: Object
    }
  },

  data () {
    return {
      card: {
        bin: '',
        name: '',
        date: '',
        cvv: '',
        birth: '',
        doc: '',
        installment: this.installmentOptions ? 1 : 0
      },
      alert: {
        bin: false,
        date: false,
        cvv: false
      },
      numberValidated: false,
      numberPotentiallyValid: false,
      activeBrand: '',
      brands: [
        'visa',
        'mastercard',
        'american-express',
        'elo',
        'diners-club',
        'hiper',
        'hipercard'
      ],
      hideHolderFields: this.skipHolderInfo || Boolean(this.checkHolder)
    }
  },

  computed: {
    lang () {
      return _config.get('lang')
    },

    dictionary () {
      return {
        AboutCvv,
        AtSight,
        Birthdate,
        CardNumber,
        ConfirmPurchase,
        DocNumber,
        HolderName,
        InterestFree,
        InvalidCard,
        InvalidCardMsg,
        NameOnCard,
        Of,
        ParcelIn,
        SecurityCode,
        ValidThru,
        ...this.mergeDictionary
      }
    },

    holderName: {
      get () {
        return this.card.name
      },
      set (value) {
        this.card.name = value.toUpperCase()
      }
    },

    compareName () {
      return this.checkHolder.replace(/(\s.*)/, '')
    },

    installmentList () {
      return this.installmentOptions.concat().sort((a, b) => {
        return a.number - b.number
      })
    }
  },

  methods: {
    formatMoney,

    i18n (label) {
      return i18n(this.dictionary[label])
    },

    checkName () {
      if (!this.skipHolderInfo && this.checkHolder) {
        const name = this.card.name.replace(/(\s.*)/, '')
        if (name === '') {
          this.hideHolderFields = true
        } else if (name.localeCompare(this.compareName, 'en', { sensitivity: 'base' }) === 0) {
          this.hideHolderFields = true
          this.card.doc = this.card.birth = ''
        } else {
          this.hideHolderFields = false
        }
      }
    },

    validateDate () {
      const month = this.card.date.substr(0, 2)
      const year = this.card.date.substr(2, 2)
      if (year.length === 2) {
        return cardValidator.expirationMonth(month).isValid &&
          cardValidator.expirationYear(year).isValid
      }
      return false
    },

    validateCvv () {
      return cardValidator
        .cvv(this.card.cvv, this.activeBrand !== 'american-express' ? 3 : 4).isValid
    },

    generateCardHash () {
      return this.jsClient.loaded.then(() => {
        const cardHash = this.jsClient.cc_hash
        if (cardHash && cardHash.function) {
          const { name, doc, bin, cvv, date } = this.card
          return window[cardHash.function]({
            name,
            doc,
            number: bin,
            cvc: cvv,
            month: date.substr(0, 2),
            year: date.substr(2, 2)
          })
        }
        return ''
      })
    },

    emitCardData (hash) {
      const { bin, name, cvv, doc, birth, installment, address } = this.card
      const transaction = {
        credit_card: {
          holder_name: name,
          last_digits: bin.slice(-4),
          save: true,
          cvv: parseInt(cvv, 10),
          hash
        }
      }
      if (installment) {
        transaction.installments_number = installment
      }
      if (address && address.zip) {
        transaction.billing_address = address
      }
      if (name && doc) {
        transaction.payer = {
          fullname: name,
          doc_number: doc.replace(/\D/g, '')
        }
        if (birth) {
          const dateNumber = (start, ln) => parseInt(birth.substr(start, ln), 10)
          let day, month, year
          if (countryCode === 'BR') {
            day = dateNumber(0, 2)
            month = dateNumber(2, 2)
            year = dateNumber(4, 4)
          } else {
            day = dateNumber(6, 2)
            month = dateNumber(4, 2)
            year = dateNumber(0, 4)
          }
          transaction.payer.birth_date = { day, month, year }
        }
      }
      this.$emit('checkout', transaction)
    },

    notifyInvalidCard () {
      this.$bvToast.toast(this.i18n('InvalidCardMsg'), {
        title: this.i18n('InvalidCard'),
        variant: 'warning',
        solid: true
      })
    },

    submit () {
      const { alert } = this
      alert.bin = !this.numberPotentiallyValid
      alert.date = !this.validateDate()
      alert.cvv = !this.validateCvv()
      if (!alert.bin && !alert.date && !alert.cvv) {
        const $form = this.$el
        if ($form.checkValidity() && this.validateDate() && this.validateCvv()) {
          if (this.jsClient) {
            this.generateCardHash()
              .then(this.emitCardData)
              .catch(err => {
                console.error(err)
                this.notifyInvalidCard()
              })
          } else {
            this.emitCardData()
          }
        }
        $form.classList.add('was-validated')
      } else {
        this.notifyInvalidCard()
      }
    }
  },

  watch: {
    'card.bin' (bin) {
      this.numberValidated = this.numberPotentiallyValid = false
      const numberCheck = cardValidator.number(bin.replace(/\D/g, ''))
      if (numberCheck.isPotentiallyValid && numberCheck.card) {
        this.activeBrand = numberCheck.card.type
        if (numberCheck.isValid) {
          this.numberValidated = this.numberPotentiallyValid = true
        } else {
          this.numberPotentiallyValid = numberCheck.isPotentiallyValid
        }
      } else {
        this.activeBrand = ''
      }
    },

    alert: {
      handler () {
        this.$el.classList.remove('was-validated')
      },
      deep: true
    }
  },

  created () {
    if (this.jsClient) {
      const script = document.createElement('script')
      script.async = true
      script.defer = true
      this.jsClient.loaded = new Promise(resolve => {
        script.onload = () => {
          resolve()
          const expression = this.jsClient.onload_expression
          if (expression) {
            try {
              eval(expression)
            } catch (err) {
              console.error(err, expression)
            }
          }
        }
      })
      script.setAttribute('src', this.jsClient.script_uri)
      document.head.appendChild(script)
    }
  },

  mounted () {
    const $inputs = this.$el.querySelectorAll('input')
    for (let i = 0; i < $inputs.length; i++) {
      if (!$inputs[i].value) {
        $inputs[i].focus()
        break
      }
    }
  }
}

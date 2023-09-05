import {
    AbstractWalletPlugin,
    Canceled,
    Chains,
    Checksum256,
    LoginContext,
    PermissionLevel,
    ResolvedSigningRequest,
    Serializer,
    SigningRequest,
    TransactContext,
    Transaction,
    WalletPlugin,
    WalletPluginConfig,
    WalletPluginLoginResponse,
    WalletPluginMetadata,
    WalletPluginSignResponse,
} from '@wharfkit/session'

import {Api, JsonRpc} from 'eosjs'
import ScatterJS from '@scatterjs/core'
import ScatterEOS from '@scatterjs/eosjs2'

import {ScatterAccount} from './types'

export class WalletPluginTokenPocket extends AbstractWalletPlugin implements WalletPlugin {
    id = 'scatter'

    translations = {}

    /**
     * The logic configuration for the wallet plugin.
     */
    readonly config: WalletPluginConfig = {
        // Should the user interface display a chain selector?
        requiresChainSelect: true,

        // Should the user interface display a permission selector?
        requiresPermissionSelect: false,
    }

    constructor() {
        super()
        ScatterJS.plugins(new ScatterEOS())
    }

    /**
     * The metadata for the wallet plugin to be displayed in the user interface.
     */
    readonly metadata: WalletPluginMetadata = WalletPluginMetadata.from({
        name: 'TokenPocket',
        description: '',
        logo: {
            dark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAABrYSURBVHgB7d1PjF3nXfDx57RpEyBxQl/U+k1elEivhCcLiIXIH8QiFQaVDYoLi7IgJrtKjRDbNtl005AttEZiR5wVC4i9jMBVvED4j5DcDRkvAAeRMAFE0ziirhA9zG/u3PGdO+fOvefec//+Ph9pGM/4joF4PM/3POd5nlM9+c0f1wUASOVTBQBIRwAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASOi+wkJtfWH37WQpjz1SoNH7H+2+/aCUOz8sZfvDwpo78UApD+6+nbi/9+/+oQd6n4/3Jx5o/pqP7+7+/e+/ffyj3ufi++KDjwp0RgAsQPwj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Dz1QNlLc649dEAZ+Np0AYGYndgeCUydL2dp9O3F/WXsx2L//A9u9xom/9wc3LAI+uWvQJw8BAAAJWQQIAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJ/S/MYXeG0cb1RQAAAABJRU5ErkJggg==',
            light: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAZlBMVEX///8pgP7Z6f9Xm/7C2/9tqP5Ikv7R5P+lyv9xq/40h/9hof8xhP43iP5lpP4nf/71+f9Olv7u9f+y0v8/jf6cxf/j7/9LlP58sv/q8//J3//c6/+Dtv47i/6UwP+81/+jyP+Juf6QLkp1AAAFJklEQVR4nO2c6baqIBSAb5IDSh4RBzLFfP+XvHaaB0GFws7a37/WSuNThr232L9/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgFVSZz2fapeO/Z0kSdLCqU4H+kX/OTHq4bfBfNjaKUY1p5fYOf66ZZcD/V0x7tBxGinD1JtPiVzRqtuTFH4reIwQLU/HlTTCtWgdUypVhcOVFsRzRSVtTlJUrLegm8cjGxrXgvlbEzJClHoehwZlXGaSVsKlG0JeHkoI5YE/epwNg3GjLbJaNW47ZFK0XVzKbjrJ+t5ZaavE8csrNRXirl+apFUej7hSHmaOpkoUGRFZbbD/4uwFc71RQ5BQHBRaIobuSH9R86eG9INj/GVqIsWU8SkRErOHdhQMZ1POkNU6JsZEVpm47+WOiCbOI40b7BYgsuK3rUj8bvq8TlA+28SgSHw7cfm1N+MUhArHvggKtlePbtLwMGBiUIRe5y2nnudxOIuY17sMipSXJjjdnH51Nrm5sZZFkoBqnKafx+cs8m/oWskaa50zxJVdkfNg1xggR7I5A9789FvsdRMDQvfTl3iTC+Jvz0qYfhhK3OnBijkRL//98W1t4IReN7lzGRNp+O8QTdrIxNkosyZCj8GvrzvSj5BuanZiSqQ5hYxMZwm5QqKpi4mpVBefpqxOsyZzZsMnRiqcGyg+kOxUfEiZsbkDTVwV81y/L5BLllroBFn3lI8JpwJfd3SSDOFLYue7xlalqct7kqxrlG3CzT2htEHk/PWw8aLupr7WmhnqB8K+t067J6l/KSxfKtNM3kWoYNdatHOteG73xnpW37dyE8V6H0l+grgDd31MXkgaryy9Rt0FSZcaqKTOEklaVzn5NlGdB0HOkXqyxIVeyU4tshoSCZDiQoeoZn6xTYsqqFXf7aPptS0RoehZJArOj1ISJ1dFyYhNDrhMiXTyph08rt8u9tLf6EX2e0siKZe3zBN3nX6nWD2pEJZEtnKRPl26+7oqt8/q2pJIgaUi3mNonuTSqavh3JKIIxV5EZkz6eSQLVUEPz3UYtIyxTeJSEOzxYo8PzBl0mlroSI/d9X6I4F0sC9V5CfLH0QUefFiRUJ+/+C3jzGl64jXdQsVidldQUGVm9I8X6gI5eymczmqzSP2gkalSMT7IP536kq2604Vx9sL49UiUdz1Kmmfj4zY2eH6rzZTLEQEIRfzmuOYqgt53FqGOEaEepm8QnMh7N5efPiMCN3/DZHpda2Fisx6kLhEEWRg7l2CCMFGboh9kae8+EtFXiQv3ymyEbM2pCxOhMRmhrp1kedk8jtFSG1mpNsWCZ82rH6pCA0MPOFZgEhWz980uySRhr/eZv9tIs1zQfIrRfro3dwAsShicsKyKdLg1tRKaFUkw2b7lS0RT+u9i8WIEKT3JsxSRJqYGR4eVkR0X0xahgjJEGfG4l17IgR17fhXl5cggp5FNmXkdoH/ll71NpEGxXHUizTkRNhQV7S6b1J+XISgOmB5h7Eb9cS4FnnAJrwOvxSRw3P27XbnswMBu9tC+G0ihwk2SU98wuJdIkYTjZGACIi8CRABkTcBIiDyJkAERN7E3xGRvag69DBfIVIb2H41GUe2/z4beJhfcGmdXbw5GXzdppwONmrwvwzkb/Sg9sMOxzY5YqhRYTz4d0VOPvjnNJtI80+O5pKsa5ptngmzaHj/UVKJiJb0Ff1RFoY6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwh/gOl/IhHuogvmQAAAABJRU5ErkJggg==',
        },
        homepage: 'https://www.tokenpocket.pro/',
        download: 'https://www.tokenpocket.pro/en/download/app',
    })
    /**
     * Performs the wallet logic required to login and return the chain and permission level to use.
     *
     * @param options WalletPluginLoginOptions
     * @returns Promise<WalletPluginLoginResponse>
     */
    login(context: LoginContext): Promise<WalletPluginLoginResponse> {
        return new Promise((resolve, reject) => {
            this.handleLogin(context)
                .then((response) => {
                    resolve(response)
                })
                .catch((error) => {
                    reject(error)
                })
        })
    }

    async handleLogin(context: LoginContext): Promise<WalletPluginLoginResponse> {
        if (!context.ui) {
            throw new Error('No UI available')
        }

        // Retrieve translation helper from the UI, passing the app ID
        // const t = context.ui.getTranslate(this.id)

        const {account} = await this.getScatter(context)
        let chainId: string
        if (account.chainId) {
            chainId = account.chainId
        } else if (
            account.blockchain &&
            Object.keys(Chains).includes(account.blockchain.toUpperCase())
        ) {
            chainId = Chains[account.blockchain.toUpperCase()].id
        } else {
            throw new Error('Unknown chain')
        }

        return {
            chain: Checksum256.from(chainId),
            permissionLevel: PermissionLevel.from(`${account.name}@${account.authority}`),
        }
    }

    async getScatter(context): Promise<{account: ScatterAccount; connector: any}> {
        // Ensure connected
        const connected: boolean = await ScatterJS.connect(context.appName)
        if (!connected) {
            throw new Error('Unable to connect with TokenPocket wallet')
        }

        // Setup network
        const url = new URL(context.chain.url)
        const network = ScatterJS.Network.fromJson({
            blockchain: context.chain.name,
            chainId: String(context.chain.id),
            host: url.hostname,
            port: url.port,
            protocol: url.protocol.replace(':', ''),
        })

        // Ensure connection and get identity
        const scatterIdentity = await ScatterJS.login({accounts: [network]})
        if (!scatterIdentity || !scatterIdentity.accounts) {
            throw new Error('Unable to retrieve account from TokenPocket')
        }
        const account: ScatterAccount = scatterIdentity.accounts[0]

        // Establish connector
        const rpc = new JsonRpc(network.fullhost())
        rpc.getRequiredKeys = async () => [] // Hacky way to get around getRequiredKeys
        const connector = ScatterJS.eos(network, Api, {rpc})

        return {
            account,
            connector,
        }
    }

    /**
     * Performs the wallet logic required to sign a transaction and return the signature.
     *
     * @param chain ChainDefinition
     * @param resolved ResolvedSigningRequest
     * @returns Promise<Signature>
     */
    sign(
        resolved: ResolvedSigningRequest,
        context: TransactContext
    ): Promise<WalletPluginSignResponse> {
        return this.handleSignatureRequest(resolved, context)
    }

    private async handleSignatureRequest(
        resolved: ResolvedSigningRequest,
        context: TransactContext
    ): Promise<WalletPluginSignResponse> {
        if (!context.ui) {
            throw new Error('No UI available')
        }

        // Retrieve translation helper from the UI, passing the app ID
        // const t = context.ui.getTranslate(this.id)

        // Get the connector from Scatter
        const {connector} = await this.getScatter(context)

        // Encode the resolved transaction
        const encoded = Serializer.encode({object: resolved.transaction})

        // So eosjs can decode it in its own format
        const decoded = await connector.deserializeTransactionWithActions(encoded.array)

        // Call transact on the connector
        const response = await connector.transact(decoded, {
            broadcast: false,
        })

        if (!response.serializedTransaction) {
            throw new Canceled('User Canceled request')
        }

        // Get the response back (since the wallet may have modified the transaction)
        const modified = Serializer.decode({
            data: response.serializedTransaction,
            type: Transaction,
        })

        // Create the new request and resolve it
        const modifiedRequest = await SigningRequest.create(
            {
                transaction: modified,
            },
            context.esrOptions
        )
        const abis = await modifiedRequest.fetchAbis(context.abiCache)
        const modifiedResolved = modifiedRequest.resolve(abis, context.permissionLevel)

        // Return the modified request and the signatures from the wallet
        return {
            signatures: response.signatures,
            resolved: modifiedResolved,
        }
    }
}

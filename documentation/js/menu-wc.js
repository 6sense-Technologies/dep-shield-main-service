'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">ds-backend-prototype documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' : 'data-bs-target="#xs-controllers-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' :
                                            'id="xs-controllers-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' }>
                                            <li class="link">
                                                <a href="controllers/AppController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' : 'data-bs-target="#xs-injectables-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' :
                                        'id="xs-injectables-links-module-AppModule-4118a9d9cead2b1743668584a6d21e0327f144e37ea6b99075a679da4bccd8087cbdc5f0aadb86b69faeb0c059378ca5bff877b60cf649801be448f162d37901"' }>
                                        <li class="link">
                                            <a href="injectables/AppService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/EmailService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EmailService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' :
                                            'id="xs-controllers-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' :
                                        'id="xs-injectables-links-module-AuthModule-a117ea6311d299f65355a27bc0a9aa10e8d7258a0a572bd03716cbd4dd60a71c6fe9cbb5ffa2c7ee6a4766a0ebf541bafd449f93e291860072e23ec64470ee8c"' }>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/EmailService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EmailService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JWTRefreshTokenStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JWTRefreshTokenStrategy</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtStrategy</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/DependenciesModule.html" data-type="entity-link" >DependenciesModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' : 'data-bs-target="#xs-controllers-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' :
                                            'id="xs-controllers-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' }>
                                            <li class="link">
                                                <a href="controllers/DependenciesController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DependenciesController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' : 'data-bs-target="#xs-injectables-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' :
                                        'id="xs-injectables-links-module-DependenciesModule-8e8ee38ee53dae72290a601fcb4d0f84c7a7151228270927b13a8f92350db21d6f10764a63946608d0f62d8df38c4618ed325c3d71b3e83b880e1da774d03531"' }>
                                        <li class="link">
                                            <a href="injectables/DependenciesService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DependenciesService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/DependencyRepositorySchemaModule.html" data-type="entity-link" >DependencyRepositorySchemaModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/DependencySchemaModule.html" data-type="entity-link" >DependencySchemaModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/EmailModule.html" data-type="entity-link" >EmailModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' : 'data-bs-target="#xs-controllers-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' :
                                            'id="xs-controllers-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' }>
                                            <li class="link">
                                                <a href="controllers/EmailController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EmailController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' : 'data-bs-target="#xs-injectables-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' :
                                        'id="xs-injectables-links-module-EmailModule-13db77bb324c748a0d22ef18d8b4d0410499dc98963f4317f2075311bbb95a0fe1577b24c4348cb1332a05dcc8c29b0e59c93bc07f76f323b866b4068c411384"' }>
                                        <li class="link">
                                            <a href="injectables/EmailService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EmailService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/GithubAppModule.html" data-type="entity-link" >GithubAppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' : 'data-bs-target="#xs-controllers-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' :
                                            'id="xs-controllers-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' }>
                                            <li class="link">
                                                <a href="controllers/GithubAppController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >GithubAppController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' : 'data-bs-target="#xs-injectables-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' :
                                        'id="xs-injectables-links-module-GithubAppModule-4cc57b377f9ec27a9aeaa3765f585e0542007a6826782acfb97401a94a83800f86d12aa81747987db313e0a4fa38240194f8c9f4003d3bc4ec3f8f5e7730cc0d"' }>
                                        <li class="link">
                                            <a href="injectables/GithubAppService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >GithubAppService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/GithubAppSchemaModule.html" data-type="entity-link" >GithubAppSchemaModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/LicenseSchemaModule.html" data-type="entity-link" >LicenseSchemaModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/LicensesModule.html" data-type="entity-link" >LicensesModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' : 'data-bs-target="#xs-controllers-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' :
                                            'id="xs-controllers-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' }>
                                            <li class="link">
                                                <a href="controllers/LicensesController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LicensesController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' : 'data-bs-target="#xs-injectables-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' :
                                        'id="xs-injectables-links-module-LicensesModule-a799e848a534cd498a36b9b27483d714819f0fbf75006f5813e30b5255cdb101099f1d8f918b1eeb2b84f0d458c4de6e7b2fde3359867fe9022e2f463c95c59a"' }>
                                        <li class="link">
                                            <a href="injectables/LicensesService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LicensesService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/OTPSecretSchemaModule.html" data-type="entity-link" >OTPSecretSchemaModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/RepositoryModule.html" data-type="entity-link" >RepositoryModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' : 'data-bs-target="#xs-controllers-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' :
                                            'id="xs-controllers-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' }>
                                            <li class="link">
                                                <a href="controllers/RepositoryController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RepositoryController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' : 'data-bs-target="#xs-injectables-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' :
                                        'id="xs-injectables-links-module-RepositoryModule-4eb0210ded8038316b97483e854d76e0ed6a513054b7984fd9cf06d0dd4da1ef115abc448de2df3530bd8c14732b425529f6e83dc577600f7dd4f8611cf98769"' }>
                                        <li class="link">
                                            <a href="injectables/RepositoryService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RepositoryService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/RepositorySchemaModule.html" data-type="entity-link" >RepositorySchemaModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/UserSchemaModule.html" data-type="entity-link" >UserSchemaModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/VulnerabilitiesModule.html" data-type="entity-link" >VulnerabilitiesModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' : 'data-bs-target="#xs-controllers-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' :
                                            'id="xs-controllers-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' }>
                                            <li class="link">
                                                <a href="controllers/VulnerabilitiesController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >VulnerabilitiesController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' : 'data-bs-target="#xs-injectables-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' :
                                        'id="xs-injectables-links-module-VulnerabilitiesModule-75954a83198addf5dba02dcef14f0aca3e4f456454e2fa745d2bf09b3bf1257dd5c91d8248235892b70c8f57a8879494605d22e36da905ae6f7a2ca97a803aef"' }>
                                        <li class="link">
                                            <a href="injectables/DependenciesService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DependenciesService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/VulnerabilitiesService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >VulnerabilitiesService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/VulnerabilitySchemaModule.html" data-type="entity-link" >VulnerabilitySchemaModule</a>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/CreateDependencyDTO.html" data-type="entity-link" >CreateDependencyDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateVulnerabilityDTO.html" data-type="entity-link" >CreateVulnerabilityDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/Dependency.html" data-type="entity-link" >Dependency</a>
                            </li>
                            <li class="link">
                                <a href="classes/DependencyConsumer.html" data-type="entity-link" >DependencyConsumer</a>
                            </li>
                            <li class="link">
                                <a href="classes/DependencyRepository.html" data-type="entity-link" >DependencyRepository</a>
                            </li>
                            <li class="link">
                                <a href="classes/DependencyVersion.html" data-type="entity-link" >DependencyVersion</a>
                            </li>
                            <li class="link">
                                <a href="classes/EmailDTO.html" data-type="entity-link" >EmailDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/EmailTemplate.html" data-type="entity-link" >EmailTemplate</a>
                            </li>
                            <li class="link">
                                <a href="classes/GithubApp.html" data-type="entity-link" >GithubApp</a>
                            </li>
                            <li class="link">
                                <a href="classes/GithubTokenDTO.html" data-type="entity-link" >GithubTokenDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/License.html" data-type="entity-link" >License</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginDto.html" data-type="entity-link" >LoginDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/OTPSecret.html" data-type="entity-link" >OTPSecret</a>
                            </li>
                            <li class="link">
                                <a href="classes/Repository.html" data-type="entity-link" >Repository</a>
                            </li>
                            <li class="link">
                                <a href="classes/SelectRepoUrlsDto.html" data-type="entity-link" >SelectRepoUrlsDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/SelectRepoUrlSingleDTO.html" data-type="entity-link" >SelectRepoUrlSingleDTO</a>
                            </li>
                            <li class="link">
                                <a href="classes/SignupDto.html" data-type="entity-link" >SignupDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/User.html" data-type="entity-link" >User</a>
                            </li>
                            <li class="link">
                                <a href="classes/VerifyEmailDto.html" data-type="entity-link" >VerifyEmailDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/Vulnerability.html" data-type="entity-link" >Vulnerability</a>
                            </li>
                            <li class="link">
                                <a href="classes/VulnerabilityConsumer.html" data-type="entity-link" >VulnerabilityConsumer</a>
                            </li>
                            <li class="link">
                                <a href="classes/VulnerabilityVersion.html" data-type="entity-link" >VulnerabilityVersion</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AccessTokenGuard.html" data-type="entity-link" >AccessTokenGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RefreshTokenGuard.html" data-type="entity-link" >RefreshTokenGuard</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});